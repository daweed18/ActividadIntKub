# Study Organizer

Monorepo with a Spring Boot API (`study-organizer`), a Node sample backend (`src/backend`), Helm chart, Kubernetes manifests, and GitHub Actions pipelines (CI + deploy via SSH).

## Estructura
- `study-organizer/`: app Spring Boot (Java 21).
- `src/backend/`: Dockerfile y ejemplo Node.
- `src/k8s/`: manifiestos K8s.
- `src/study-organizer-chart/`: chart de Helm.
- `.github/workflows/`: CI (`ci.yml`) y CD por SSH (`deploy.yml`).
- `appspec.yml` + `scripts/`: hooks de despliegue (CodeDeploy/SSH).

## Prerrequisitos
- Java 21 (SDK/Runtime).
- Maven (wrapper incluido: `./mvnw`).
- Opcional: Docker, kubectl, helm, Prometheus/Grafana.

## Build y ejecución local (Spring Boot)
```bash
cd study-organizer
./mvnw package -DskipTests
```

### Arrancar con H2 (sin SQL Server)
```bash
SPRING_DATASOURCE_URL=jdbc:h2:mem:testdb \
SPRING_DATASOURCE_DRIVER_CLASS_NAME=org.h2.Driver \
SPRING_DATASOURCE_USERNAME=sa \
SPRING_DATASOURCE_PASSWORD= \
SPRING_JPA_DATABASE_PLATFORM=org.hibernate.dialect.H2Dialect \
SPRING_JPA_HIBERNATE_DDL_AUTO=update \
./mvnw spring-boot:run
```

### Arrancar con SQL Server
Define en `application.properties` o como env:
- `SPRING_DATASOURCE_URL=jdbc:sqlserver://<host>:1433;databaseName=StudyOrganizer;encrypt=false;trustServerCertificate=true`
- `SPRING_DATASOURCE_USERNAME=<user>`
- `SPRING_DATASOURCE_PASSWORD=<pass>`
- `SPRING_DATASOURCE_DRIVER_CLASS_NAME=com.microsoft.sqlserver.jdbc.SQLServerDriver`

Luego:
```bash
./mvnw spring-boot:run
```

### Endpoints
- Salud: `GET /actuator/health`
- Métricas: `GET /actuator/prometheus`
- Ping: `GET /ping`
- CRUD tareas: `GET/POST/PUT/DELETE /tasks`

## Docker (Node sample)
```bash
docker build -t study-organizer-node -f src/backend/Dockerfile src/backend
# docker run -p 8080:8080 study-organizer-node
```

## CI/CD (GitHub Actions)
- CI (`ci.yml`): `mvn package -DskipTests` en `study-organizer` y `docker build` del Node backend.
- CD-SSH (`deploy.yml`): copia el JAR al servidor y lo arranca por SSH.
  - Secrets requeridos: `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY` (PEM), `EC2_PORT` (opcional).
  - Destino: `/home/<user>/study-organizer/` y `nohup java -jar ...`.

## Despliegue manual por SSH
1) Copiar JAR:
```bash
scp -i <key.pem> study-organizer/target/study-organizer-0.0.1-SNAPSHOT.jar <user>@<host>:/home/<user>/study-organizer/
```
2) Arrancar con H2:
```bash
SPRING_DATASOURCE_URL=jdbc:h2:mem:testdb \
SPRING_DATASOURCE_DRIVER_CLASS_NAME=org.h2.Driver \
SPRING_DATASOURCE_USERNAME=sa \
SPRING_DATASOURCE_PASSWORD= \
SPRING_JPA_DATABASE_PLATFORM=org.hibernate.dialect.H2Dialect \
SPRING_JPA_HIBERNATE_DDL_AUTO=update \
nohup java -jar /home/<user>/study-organizer/study-organizer-0.0.1-SNAPSHOT.jar > /home/<user>/study-organizer/app.log 2>&1 &
```
3) Probar: `curl http://<host>:8080/ping`

## Kubernetes / Helm
- Manifiestos: `src/k8s/` (Deployment/Service).
- Chart: `src/study-organizer-chart/` (valores en `values.yaml`, plantillas en `templates/`).
- Ejemplo Helm:
```bash
helm upgrade --install study-organizer ./src/study-organizer-chart -n default
```

## Monitoreo (Prometheus + Grafana)
1) App expone `/actuator/prometheus`.
2) Prometheus `scrape_configs`:
```yaml
- job_name: "spring-app"
  metrics_path: /actuator/prometheus
  static_configs:
    - targets: ["localhost:8080"]
```
3) Grafana: data source Prometheus (`http://localhost:9090`) e importar dashboard 11378.

## Notas AWS
- CodeDeploy no se usó por activación de cuenta pendiente; CD alternativo via SSH.
- Si se habilita CodeDeploy/S3: usar `appspec.yml` y `scripts/` incluidos.

## Problemas comunes
- Falla por SQL Server: usa el arranque con H2 (variables arriba).
- Puerto 8080 inaccesible: abrir en el Security Group.
- SSH desde Actions: puerto 22 abierto a Internet y secrets correctos.
