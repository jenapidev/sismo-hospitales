-- The 6 Caracas hospitals tracked after the earthquake.
-- drive_folder_id is filled in once we resolve each folder during sync (Task 9),
-- matched by the folder NAME in the public Drive root.
insert into hospitals (name, slug, location) values
 ('Hospital Carlos Arvelo','carlos-arvelo','Caracas'),
 ('Hospital de Catia','catia','Caracas'),
 ('Hospital Luciani','luciani','Caracas'),
 ('Hospital Pérez Carreño','perez-carreno','Caracas'),
 ('Hospital Universitario de Caracas','universitario-caracas','Caracas'),
 ('Hospital Vargas de Caracas','vargas-caracas','Caracas')
on conflict (slug) do nothing;
