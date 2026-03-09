# mecanum_rviz_simulation

Simulación RViz de un robot mecanum (ROS).

## Contenido del repositorio

```
src/
└── mecanum_rviz/   # Paquete ROS con launch, URDF y configuración de RViz
mecanum-ui/         # Interfaz web: login, dashboard 2D y teleoperación
```

## Lanzar la simulación RViz

```bash
source ~/mecanum_ws/devel/setup.bash
roslaunch mecanum_rviz mecanum_view.launch
```

## Subproyecto mecanum-ui (interfaz web)

El directorio [`mecanum-ui/`](mecanum-ui/) contiene una interfaz web ligera que permite:

- **Login** simple (admin / admin, solo demo).
- **Dashboard** con mapa 2D del robot usando ROS2D/ROSLIBJS.
- **Controles de teleoperación omnidireccional** que publican `/cmd_vel` vía rosbridge WebSocket (`ws://JETSON_IP:9090`).

### Ejecución rápida

```bash
cd mecanum-ui
npm install
npm start
# Abrir en el navegador: http://localhost:3000
```

Introduce la IP del Jetson en el dashboard y pulsa **Conectar**.

Consulta [`mecanum-ui/README.md`](mecanum-ui/README.md) para más detalles (puertos, atajos de teclado, notas de seguridad).
