# mecanum-ui

Interfaz web ligera para el robot mecanum: login, dashboard con visualización 2D del mapa y controles de teleoperación omnidireccional vía [rosbridge](https://github.com/RobotWebTools/rosbridge_suite).

## Estructura

```
mecanum-ui/
├── package.json        # Dependencias Node.js (Express)
├── server.js           # Servidor estático Express (puerto 3000)
├── README.md           # Este archivo
└── public/
    ├── login.html      # Página de login (admin / admin)
    ├── dashboard.html  # Dashboard: mapa 2D + teleop
    ├── css/
    │   └── style.css   # Estilos del login y dashboard
    └── js/
        └── app.js      # Lógica ROSLIBJS / ROS2D / cmd_vel
```

## Requisitos previos

| Componente | Descripción |
|---|---|
| **Node.js ≥ 16** | Para ejecutar el servidor |
| **rosbridge_suite** | Activo en el Jetson (`ros2 launch rosbridge_server rosbridge_websocket_launch.xml`) |
| Puerto **9090** TCP | WebSocket rosbridge accesible desde el PC |
| *(Opcional)* Puerto **6080** TCP | noVNC para ver RViz en el navegador |

## Instalación y ejecución

```bash
cd mecanum-ui
npm install
npm start
```

Abre en el navegador: **http://localhost:3000**

## Uso

1. **Login**: introduce `admin` / `admin` y pulsa *Entrar*.
2. **Dashboard**: en el campo *IP Jetson* escribe la IP de tu Jetson (p. ej. `192.168.1.100`) y pulsa **Conectar**.
3. El estado de conexión cambiará a **Conectado**. El mapa 2D aparecerá si hay un tópico `/map` disponible.
4. Usa los botones omnidireccionales o los atajos de teclado para teleoperar:

   | Tecla | Acción |
   |---|---|
   | ↑ | Adelante |
   | ↓ | Atrás |
   | ← | Giro izquierda |
   | → | Giro derecha |
   | A | Strafe izquierda |
   | D | Strafe derecha |
   | Espacio | Stop |

## Puertos necesarios en el Jetson

```bash
# Abrir puertos si se usa UFW
sudo ufw allow 9090/tcp   # rosbridge WebSocket
sudo ufw allow 6080/tcp   # noVNC (opcional, para ver RViz)
sudo ufw reload
```

## Notas de seguridad

- El login es **solo del lado del cliente** y se usa únicamente como demo. No almacena credenciales en el servidor. Para producción, implementa autenticación en el backend.
- No incluyas credenciales reales en el código fuente.

## Dependencias

- [Express](https://expressjs.com/) – servidor HTTP estático
- [ROSLIBJS](https://github.com/RobotWebTools/roslibjs) – comunicación con ROS vía rosbridge (CDN)
- [ROS2D](https://github.com/RobotWebTools/ros2djs) – visualización 2D del mapa (CDN)
- [EaselJS](https://www.createjs.com/easeljs) – canvas 2D, dependencia de ROS2D (CDN)
