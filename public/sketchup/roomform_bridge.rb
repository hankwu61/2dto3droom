# encoding: UTF-8
require 'sketchup.rb'
require 'json'
module RoomformBridge
  extend self
  def import_mesh
    path = UI.openpanel('Import ROOMFORM mesh JSON', '', 'JSON|*.json||')
    return unless path
    raise 'File exceeds 50 MB' if File.size(path) > 50_000_000
    data = JSON.parse(File.read(path, encoding: 'UTF-8'))
    raise 'Invalid ROOMFORM mesh format' unless data['format'] == 'roomform-mesh' && data['version'] == 1 && data['units'] == 'meters' && data['upAxis'] == 'Y'
    groups = data['groups']
    raise 'Invalid groups' unless groups.is_a?(Array) && groups.length.between?(1,150)
    count = 0
    groups.each do |g|
      raise 'Invalid meshes' unless g['meshes'].is_a?(Array)
      g['meshes'].each do |m|
        p = m['positions']; count += p.is_a?(Array) ? p.length : 0
        raise 'Invalid triangle data' unless p.is_a?(Array) && p.length > 0 && p.length % 9 == 0 && p.all? { |v| v.is_a?(Numeric) && v.finite? && v.abs <= 100_000 }
        raise 'Invalid color' unless m['color'].is_a?(String) && m['color'].match?(/\A#[0-9a-f]{6}\z/i)
      end
    end
    raise 'Model exceeds one million triangles' if count > 9_000_000
    model = Sketchup.active_model
    model.start_operation('Import ROOMFORM', true)
    begin
      parent = model.entities.add_group
      parent.name = 'ROOMFORM import'
      groups.each do |g|
        group = parent.entities.add_group
        group.name = g['name'].to_s
        g['meshes'].each do |m|
          mesh = Geom::PolygonMesh.new
          m['positions'].each_slice(9) do |tri|
            # Meter Y-up -> SketchUp inch Z-up. This rotation preserves handedness.
            points = tri.each_slice(3).map { |x,y,z| Geom::Point3d.new(x / 0.0254, -z / 0.0254, y / 0.0254) }
            mesh.add_polygon(points)
          end
          material = model.materials.add('ROOMFORM surface')
          material.color = Sketchup::Color.new(m['color'])
          material.alpha = [[m.fetch('opacity',1).to_f,0].max,1].min
          group.entities.add_faces_from_mesh(mesh, 0, material, material)
        end
      end
      model.commit_operation
      model.active_view.zoom_extents
      UI.messagebox('Import complete. Use File > Save As to save a native .skp file. Existing model geometry was preserved.')
    rescue => e
      model.abort_operation
      raise e
    end
  rescue => e
    UI.messagebox("ROOMFORM import failed: #{e.message}")
  end
  def walk(entities, transform, meshes, inherited=nil)
    entities.each do |entity|
      next if entity.hidden? || (entity.respond_to?(:layer) && !entity.layer.visible?)
      if entity.is_a?(Sketchup::Face)
        material = entity.material || inherited
        color = material ? material.color : Sketchup::Color.new(204,204,204)
        mesh = entity.mesh(0)
        positions = []
        mesh.polygons.each do |polygon|
          ids = polygon.map(&:abs)
          (1...(ids.length-1)).each do |i|
            [ids[0],ids[i],ids[i+1]].each do |id|
              p = mesh.point_at(id).transform(transform)
              positions.concat([p.x.to_f*0.0254,p.z.to_f*0.0254,-p.y.to_f*0.0254])
            end
          end
        end
        meshes << {'positions'=>positions,'color'=>format('#%02x%02x%02x',color.red,color.green,color.blue),'opacity'=>material ? material.alpha : 1} unless positions.empty?
      elsif entity.is_a?(Sketchup::Group) || entity.is_a?(Sketchup::ComponentInstance)
        children = entity.is_a?(Sketchup::Group) ? entity.entities : entity.definition.entities
        walk(children, transform * entity.transformation, meshes, entity.material || inherited)
      end
    end
  end
  def export_mesh
    path = UI.savepanel('Export to ROOMFORM', '', 'sketchup.mesh.json')
    return unless path
    groups = []
    loose = []
    Sketchup.active_model.entities.each do |entity|
      if entity.is_a?(Sketchup::Group) || entity.is_a?(Sketchup::ComponentInstance)
        meshes = []; walk([entity], Geom::Transformation.new, meshes)
        groups << {'name'=>entity.name.empty? ? 'SketchUp group' : entity.name,'meshes'=>meshes} unless meshes.empty?
      else
        loose << entity
      end
    end
    meshes = []; walk(loose, Geom::Transformation.new, meshes)
    groups << {'name'=>'Loose geometry','meshes'=>meshes} unless meshes.empty?
    raise 'No visible faces to export' if groups.empty?
    raise 'More than 150 top-level groups; group related objects first' if groups.length > 150
    groups.each do |group|
      by_material = {}
      group['meshes'].each do |mesh|
        key = [mesh['color'], mesh['opacity']]
        if by_material[key]
          by_material[key]['positions'].concat(mesh['positions'])
        else
          by_material[key] = mesh
        end
      end
      group['meshes'] = by_material.values
    end
    data = {'format'=>'roomform-mesh','version'=>1,'units'=>'meters','upAxis'=>'Y','groups'=>groups}
    json = JSON.generate(data)
    raise 'Exchange file exceeds 50 MB' if json.bytesize > 50_000_000
    File.write(path,json,encoding:'UTF-8')
    UI.messagebox('Export complete. Import this JSON with ROOMFORM SketchUp model exchange. Textures, scenes and parametric semantics are not included.')
  rescue => e
    UI.messagebox("ROOMFORM export failed: #{e.message}")
  end
  unless file_loaded?(__FILE__)
    menu = UI.menu('Extensions').add_submenu('ROOMFORM')
    menu.add_item('Import ROOMFORM mesh (then Save As SKP)') { import_mesh }
    menu.add_item('Export current SKP to ROOMFORM mesh') { export_mesh }
    file_loaded(__FILE__)
  end
end
