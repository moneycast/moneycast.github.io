# Mini PWA para enviar datos por WhatsApp

Instrucciones mínimas para desplegar en GitHub Pages:

1. Añade este repositorio a GitHub.
2. En las opciones del repo, activa GitHub Pages desde la rama `main` (o `gh-pages`) y la carpeta `/`.
3. La PWA estará disponible vía HTTPS. Puedes instalarla desde el navegador.

Notas:
- La app usa Tesseract.js para OCR en el navegador.
- Soporta tomar fotos, elegir de la galería o compartir desde otras apps (Web Share Target).
- Al enviar, abre 3 enlaces de WhatsApp (uno por cada mensaje). En móvil usa el esquema `whatsapp://`.
