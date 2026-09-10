# Pantallas a modificar

## Comparación antes / después

- Las imágenes de **esta carpeta** son el estado **anterior** al rediseño visual.
- `pantallas-actualizadas/` contiene el estado **posterior**, con exactamente los mismos
  nombres de archivo, para poder abrir las dos versiones de una pantalla lado a lado.

Capturas de todas las pantallas de la SPA (`frontend/`) corriendo en `VITE_API_MODE=mock`.
Cada pantalla tiene dos archivos: `-desktop.png` (1280×800, página completa) y `-mobile.png` (390×844, página completa).

| # | Archivo | Ruta | Notas |
|---|---------|------|-------|
| 01 | `01-publica-landing` | `/` | Landing pública |
| 02 | `02-publica-login-candidato` | `/login` | Rol candidato seleccionado |
| 03 | `03-publica-login-empresa` | `/login` | Rol empresa seleccionado |
| 04 | `04-publica-registro-candidato` | `/register` | Rol candidato |
| 05 | `05-publica-registro-empresa` | `/register` | Rol empresa |
| 06 | `06-publica-registro-errores-validacion` | `/register` | Estado de error de formulario |
| 07 | `07-publica-404-no-encontrada` | `/ruta-inexistente` | 404 |
| 08 | `08-candidato-onboarding-1-familia-laboral` | `/candidate/onboarding` | Paso 1 |
| 09 | `09-candidato-onboarding-2-datos-personales` | `/candidate/onboarding` | Paso 2 |
| 10 | `10-candidato-onboarding-3-como-construir-perfil` | `/candidate/onboarding` | Paso 3 (bifurcación CV) |
| 11 | `11-candidato-cv-subir-archivo` | `/candidate/cv/upload` | |
| 12 | `12-candidato-cv-conversacional-inicio` | `/candidate/cv/build` | Turno 1 con Sofía |
| 13 | `13-candidato-cv-conversacional-en-curso` | `/candidate/cv/build` | Tras 3 respuestas |
| 14 | `14-candidato-cv-revision` | `/candidate/cv/review` | |
| 15 | `15-candidato-entrevista-preparacion-texto` | `/candidate/interview/prepare` | Modo texto |
| 16 | `16-candidato-entrevista-preparacion-voz` | `/candidate/interview/prepare` | Modo voz |
| 17 | `17-candidato-entrevista-en-curso` | `/candidate/interview/:id` | Turno 3 |
| 18 | `18-candidato-entrevista-resultado` | `/candidate/interview/:id/result` | |
| 19 | `19-candidato-home` | `/candidate` | Sesión `maria@demo.mx` |
| 20 | `20-candidato-perfil-talento-verificado` | `/candidate/profile` | Recién evaluado |
| 21 | `21-candidato-perfil-talento-verificado-maria` | `/candidate/profile` | Variante `maria@demo.mx` |
| 22 | `22-candidato-perfil-editar` | `/candidate/profile/edit` | |
| 23 | `23-candidato-oportunidades-lista` | `/candidate/opportunities` | |
| 24 | `24-candidato-oportunidad-detalle` | `/candidate/opportunities/:id` | |
| 25 | `25-candidato-oportunidad-postulado` | `/candidate/opportunities/:id` | Tras postularse |
| 26 | `26-candidato-notificaciones` | `/candidate/notifications` | Stub P2 |
| 27 | `27-candidato-mensajes` | `/candidate/messages` | Stub P2 |
| 28 | `28-empresa-onboarding-1-identidad` | `/employer/onboarding` | Paso 1 |
| 29 | `29-empresa-onboarding-2-ubicacion-modalidad` | `/employer/onboarding` | Paso 2 |
| 30 | `30-empresa-onboarding-3-equipo-cultura` | `/employer/onboarding` | Paso 3 |
| 31 | `31-empresa-home` | `/employer` | |
| 32 | `32-empresa-vacantes-lista` | `/employer/vacancies` | |
| 33 | `33-empresa-vacante-nueva` | `/employer/vacancies/new` | |
| 34 | `34-empresa-vacante-detalle` | `/employer/vacancies/:id` | |
| 35 | `35-empresa-perfil-ideal-advertencia-sesgo` | `/employer/vacancies/:id/ideal-profile` | Con advertencia discriminatoria |
| 36 | `36-empresa-talento-matching` | `/employer/vacancies/:id/talent` | Tarjetas anónimas |
| 37 | `37-empresa-candidato-detalle-anonimo` | `/employer/candidates/:matchResultId` | |
| 38 | `38-empresa-candidato-perfil-desbloqueado` | `/employer/candidates/:matchResultId/full` | |
| 39 | `39-empresa-comparar-candidatos` | `/employer/vacancies/:id/compare` | |
| 40 | `40-empresa-shortlist` | `/employer/vacancies/:id/shortlist` | |
| 41 | `41-empresa-perfil-de-la-empresa` | `/employer/company` | |
| 42 | `42-empresa-planes-y-facturacion` | `/employer/billing` | |
| 43 | `43-empresa-notificaciones` | `/employer/notifications` | Stub P2 |
| 44 | `44-empresa-mensajes` | `/employer/messages` | Stub P2 |
| 45 | `45-dev-design-system-kitchen-sink` | `/dev/ui` | Solo dev: tokens y componentes |
