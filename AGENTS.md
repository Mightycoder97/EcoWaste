# Pautas de Desarrollo para Agentes de IA / AI Agent Development Guidelines

<!-- BEGIN:nextjs-agent-rules -->
## 🏗️ Next.js Conventions
This project uses a custom Next.js version. Read `node_modules/next/dist/docs/` before writing code.
<!-- END:nextjs-agent-rules -->

## 🔄 Integración con Git (CRÍTICO) / Git Integration (CRITICAL)

### Español:
Cada vez que se cumpla con una tarea o se realice una modificación funcional en el código, **debes subir inmediatamente al repositorio remoto** (GitHub) los archivos agregados o modificados.
- Agrega los cambios: `git add .`
- Crea el commit descriptivo: `git commit -m "tarea: descripción de la tarea completada"`
- Sube los cambios de inmediato: `git push`
- **Seguridad:** Nunca elimines ni alteres el archivo `.gitignore` para subir archivos `.env*` o información sensible.

### English:
Every time a task from the checklist is completed or any functional modification is made, **you must immediately push the modified or added files to the remote repository** (GitHub).
- Stage changes: `git add .`
- Create a descriptive commit: `git commit -m "task: description of the completed task"`
- Push changes immediately: `git push`
- **Security:** Never modify `.gitignore` to upload `.env*` files or any other sensitive credentials.
