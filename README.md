# AdoptMe Final

Backend de gestión de adopciones (usuarios, mascotas y adopciones) construido con Node.js y Express.

- **Imagen en Docker Hub:** [maxirosanda/adoptmefinal](https://hub.docker.com/r/maxirosanda/adoptmefinal)

## Ejecutar con Docker

### Requisitos previos

- [Docker Engine](https://docs.docker.com/engine/install/) instalado (versión 20.x o superior).
- Una instancia de MongoDB accesible (local, en otro contenedor, o Atlas), ya que la app no incluye base de datos embebida.

### 1. Descargar la imagen desde Docker Hub

```bash
docker pull maxirosanda/adoptmefinal
```

### 2. (Alternativa) Construir la imagen localmente

Si preferís construir la imagen vos mismo en lugar de descargarla:

```bash
git clone <URL_DEL_REPOSITORIO>
cd <NOMBRE_DEL_REPOSITORIO>
docker build -t maxirosanda/adoptmefinal .
```

El `Dockerfile` usa `node:24.18.0-alpine`, instala las dependencias con `npm i`, copia el código fuente (`./src`) y expone el puerto **8080**.

### 3. Variables de entorno

La app corre por defecto en el puerto **8080** dentro del contenedor. Además, probablemente requiera variables para conectarse a MongoDB y otras configuraciones. Completá/confirmá esta tabla según tu código (por ejemplo, revisando `src/config` o donde se llame a `process.env`):

| Variable      | Descripción                                              | Ejemplo                                              | Requerida |
|---------------|-----------------------------------------------------------|-------------------------------------------------------|-----------|
| `PORT`        | Puerto en el que escucha la app dentro del contenedor      | `8080`                                                 | No (default 8080) |
| `MONGO_URL`   | Cadena de conexión a MongoDB                                | `mongodb+srv://user:pass@cluster.mongodb.net/adoptme`  | Sí |
| `JWT_SECRET`  | Secreto para firmar tokens de autenticación (si aplica)    | `unSecretoSeguro123`                                   | Sí (si hay auth) |
| `COOKIE_SECRET` | Secreto para firmar cookies (si aplica)                  | `otroSecretoSeguro456`                                 | Solo si aplica |


Creá un archivo `.env` en la raíz del proyecto con el siguiente contenido de referencia:

```env
PORT=8080
MONGO_URL=mongodb+srv://usuario:password@cluster.mongodb.net/adoptme
JWT_SECRET=cambiar_este_valor
```

### 4. Ejecutar el contenedor

**Opción A — usando un archivo `.env`:**

```bash
docker run -d \
  --name adoptme \
  -p 8080:8080 \
  --env-file .env \
  maxirosanda/adoptmefinal
```

**Opción B — pasando variables individuales con `-e`:**

```bash
docker run -d \
  --name adoptme \
  -p 8080:8080 \
  -e PORT=8080 \
  -e MONGO_URL="mongodb+srv://usuario:password@cluster.mongodb.net/adoptme" \
  -e JWT_SECRET="cambiar_este_valor" \
  maxirosanda/adoptmefinal
```

### 5. Mapeo de puertos

El contenedor expone el puerto **8080** (definido en el `Dockerfile` con `EXPOSE 8080`). El flag `-p 8080:8080` mapea:

```
-p <PUERTO_HOST>:<PUERTO_CONTENEDOR>
```

Si querés exponerlo en otro puerto del host (por ejemplo, el 3000), usá:

```bash
docker run -d --name adoptme -p 3000:8080 --env-file .env maxirosanda/adoptmefinal
```

### 6. Verificar que el contenedor está corriendo

```bash
docker ps
docker logs -f adoptme
```

La API debería quedar disponible en `http://localhost:8080` (o el puerto host que hayas elegido).

### 7. Detener y eliminar el contenedor

```bash
docker stop adoptme
docker rm adoptme
```