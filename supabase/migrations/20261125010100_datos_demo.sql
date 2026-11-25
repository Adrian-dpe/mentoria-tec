-- =====================================================================
-- Mentores de DEMOSTRACIÓN (ficticios) para presentar la plataforma.
-- Usan el dominio inexistente @demo.tec.mx y quedan marcados is_demo = true.
-- Se pueden borrar desde la consola de administración ("Borrar perfiles demo").
-- =====================================================================
do $$
declare
  d record;
  uid uuid;
  t text;
begin
  for d in
    select * from (values
      ('Mariana López Treviño', 'demo.mariana@demo.tec.mx', 'Ingeniería en Ciencia de Datos y Matemáticas', true, null::int, 2024,
       'Hice mi internship en Data Analytics en una empresa de retail y ahora trabajo como analista de datos. Me encanta ayudar a que otros encuentren su primera experiencia profesional.',
       'Internship de Data Analytics (verano 2023). Analista de datos en retail desde 2024.',
       'Intercambio en Universidad de Mannheim, Alemania (2023)',
       array['Google Data Analytics', 'Power BI Data Analyst'], array['Python', 'SQL', 'Power BI'], array['Retail', 'Consultoría'],
       array['Español', 'Inglés', 'Alemán'], 'virtual',
       array['Datos y analítica', 'Internships', 'Intercambios académicos', 'Preparación de CV y LinkedIn']),
      ('Diego Garza Salinas', 'demo.diego@demo.tec.mx', 'Ingeniería en Tecnologías Computacionales', false, 8, null,
       'Estudiante de octavo semestre. He participado en hackathons y en un reto con empresa de IA. Te puedo ayudar a elegir materias y a arrancar en desarrollo de software.',
       'Software Engineering Intern en una startup de IA (2025).',
       null,
       array['AWS Cloud Practitioner'], array['TypeScript', 'React', 'Python', 'AWS'], array['Startups', 'Tecnología'],
       array['Español', 'Inglés'], 'ambas',
       array['Inteligencia Artificial', 'Desarrollo de software', 'Nube', 'Selección de materias', 'Retos con empresas']),
      ('Sofía Ramírez Cantú', 'demo.sofia@demo.tec.mx', 'Licenciatura en Administración y Estrategia', true, null, 2022,
       'Egresada, hoy trabajo en consultoría estratégica. Fundé una asociación estudiantil y me encanta platicar de emprendimiento y entrevistas.',
       'Consultora en firma de estrategia (2022 a la fecha).',
       'Semestre en Barcelona, España (2021)',
       array[]::text[], array['Excel', 'PowerPoint'], array['Consultoría', 'Banca'],
       array['Español', 'Inglés', 'Francés'], 'virtual',
       array['Negocios', 'Emprendimiento', 'Entrevistas', 'Asociaciones estudiantiles', 'Experiencias internacionales']),
      ('Javier Hernández Ortiz', 'demo.javier@demo.tec.mx', 'Ingeniería en Ciberseguridad', true, null, 2023,
       'Trabajo en un equipo de seguridad en la nube. Puedo orientarte sobre certificaciones y cómo prepararte para tu primer empleo en tecnología.',
       'Analista de ciberseguridad en banca (2023 a la fecha).',
       null,
       array['CompTIA Security+', 'Azure Fundamentals'], array['Linux', 'Azure', 'Python'], array['Banca', 'Tecnología'],
       array['Español', 'Inglés'], 'virtual',
       array['Ciberseguridad', 'Certificaciones profesionales', 'Nube', 'Empleabilidad']),
      ('Valeria Méndez Flores', 'demo.valeria@demo.tec.mx', 'Ingeniería Industrial y de Sistemas', false, 7, null,
       'Hice prácticas en manufactura automatizando procesos y mi servicio social en una ONG. Te ayudo a encontrar prácticas y a sacarle provecho a la vida universitaria.',
       'Practicante de mejora continua en planta automotriz (2025).',
       null,
       array['Lean Six Sigma Yellow Belt'], array['Power Automate', 'Excel', 'Minitab'], array['Manufactura', 'Automotriz'],
       array['Español', 'Inglés'], 'presencial',
       array['Procesos y automatización', 'Prácticas profesionales', 'Servicio social', 'Vida universitaria']),
      ('Andrés Villarreal Leal', 'demo.andres@demo.tec.mx', 'Ingeniería en Ciencia de Datos y Matemáticas', false, 9, null,
       'Hice internship en Estados Unidos en Machine Learning. Puedo contarte cómo aplicar a internships internacionales y prepararte para entrevistas técnicas.',
       'Machine Learning Intern en empresa de tecnología en EUA (2025).',
       'Internship en Seattle, EUA (2025)',
       array['TensorFlow Developer'], array['Python', 'PyTorch', 'SQL'], array['Tecnología'],
       array['Español', 'Inglés'], 'virtual',
       array['Inteligencia Artificial', 'Datos y analítica', 'Internships', 'Entrevistas', 'Experiencias internacionales'])
    ) as v(nombre, correo, carrera, egresado, semestre, generacion, bio, exp, intercambio,
           certs, herramientas, industrias, idiomas, modalidad, temas)
  loop
    uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', d.correo, '', now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', d.nombre), now(), now(),
      '', '', '', ''
    );

    update public.profiles set
      full_name = d.nombre, career = d.carrera, is_alumni = d.egresado, semester = d.semestre,
      graduation_year = d.generacion, bio = d.bio || ' (Perfil de demostración)',
      is_mentor = true, mentor_status = 'approved', experience_professional = d.exp,
      exchanges = d.intercambio, has_international_experience = d.intercambio is not null,
      certifications = d.certs, tools = d.herramientas, industries = d.industrias,
      languages = d.idiomas, modality = d.modalidad, session_duration_min = 30,
      max_sessions_per_week = 4, is_demo = true, accepted_code_of_conduct_at = now()
    where id = uid;

    update public.profile_links
      set linkedin_url = 'https://www.linkedin.com/in/demo-mentoria-tec', linkedin_visible = true
    where profile_id = uid;

    foreach t in array d.temas loop
      insert into public.profile_topics (profile_id, topic_id, kind)
      select uid, id, 'offer' from public.topics where name = t;
    end loop;

    -- Disponibilidad: lunes a viernes, dos bloques.
    insert into public.availability (mentor_id, weekday, start_time, end_time)
    select uid, wd, time '10:00', time '13:00' from generate_series(1, 5) wd
    union all
    select uid, wd, time '16:00', time '19:00' from generate_series(1, 5) wd;
  end loop;
end;
$$;
