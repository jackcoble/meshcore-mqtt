![image](docs/assets/banner.png)

> [!WARNING]  
> This project is still in early development. Certain features may change, and the software may be unstable. Please use at your own discretion.

## Requirements

The MeshCore to MQTT Bridge requires you have a device that is flashed with the **Companion USB**, or connected to Wi-Fi.

## Message Type Support

### Response Codes

| Message Type          | Description                                           | Status | MQTT Topic                               |
| --------------------- | ----------------------------------------------------- | ------ | ---------------------------------------- |
| `SELF_INFO`           | Info about the connected node                         | ✅     | `{topic}/self_info`                      |
| `DEVICE_INFO`         | Device info about the connected node                  | ✅     | `{topic}/device_info`                    |
| `CONTACT_MSG_RECV`    | Contact message (direct)                              | ✅     | `{topic}/message/direct/{pubkey_prefix}` |
| `CHANNEL_MSG_RECV`    | Channel message                                       | ✅     | `{topic}/message/channel/{channel_idx}`  |
| `CONTACT_MSG_RECV_V3` | Contact message (direct)                              | ✅     | `{topic}/message/direct/{pubkey_prefix}` |
| `CHANNEL_MSG_RECV_V3` | Channel message                                       | ✅     | `{topic}/message/channel/{channel_idx}`  |
| `NO_MORE_MESSAGES`    | All messages have been synced                         | ✅     | -                                        |
| `BATT_AND_STORAGE`    | Battery and storage information of the connected node | ❌     | `{topic}/battery_and_storage`            |

### Push Notification Codes

| Push Notification Code | Status | Description                     |
| ---------------------- | ------ | ------------------------------- |
| `MSG_WAITING`          | ✅     | Triggers automatic message sync |

> [!NOTE]
>
> - All received messages are also published to `{topic}/all` in addition to their specific topics
> - `{topic}` is the configurable MQTT topic prefix (default: `meshcore`)
> - Direct messages (path_len = -1) are published to `{topic}/message/direct/{pubkey_prefix}`
> - Channel messages are published to `{topic}/message/channel/{channel_idx}`

## Installation (local)

```bash
$ git clone https://github.com/jackcoble/meshcore-mqtt.git
$ cd meshcore-mqtt/
$ pnpm install
```

## Configuration

The bridge can be configured using CLI arguments, a JSON config file, or environment variables. When multiple sources provide the same option, the priority is: **CLI > JSON config > Environment variables**.

### CLI Arguments

```bash
$ pnpm start --help

Options:
  -V, --version                    output the version number
  -c, --config <path>              Path to JSON config file (default: "config.json")
  -t, --connection-type <type>     Connection type: serial or tcp (default: serial)
  -p, --port <port>                Serial port (e.g., /dev/ttyUSB0 or COM3)
  -b, --baudrate <rate>            Serial baudrate
  --tcp-host <host>                TCP host for TCP connection
  --tcp-port <port>                TCP port for TCP connection (default: 5000)
  -m, --mqtt-broker <broker>       MQTT broker hostname or IP
  --mqtt-port <port>               MQTT broker port
  --mqtt-user <user>               MQTT username
  --mqtt-pass <password>           MQTT password
  --mqtt-topic <topic>             MQTT topic prefix
  --debug                          Enable debug logging
```

Example (Serial connection):

```bash
$ pnpm start --port /dev/ttyUSB0 --mqtt-broker localhost --debug
```

Example (TCP connection):

```bash
$ pnpm start --connection-type tcp --tcp-host 192.168.1.100 --tcp-port 5000 --mqtt-broker localhost
```

### JSON Config File

Create a `config.json` file in the project root (or specify a custom path with `-c`):

**Serial connection example:**

```json
{
    "connectionType": "serial",
    "port": "/dev/ttyUSB0",
    "baudrate": 115200,
    "mqttBroker": "localhost",
    "mqttPort": 1883,
    "mqttUser": "user",
    "mqttPass": "password",
    "mqttTopic": "meshcore",
    "debug": false
}
```

**TCP connection example:**

```json
{
    "connectionType": "tcp",
    "tcpHost": "192.168.1.100",
    "tcpPort": 5000,
    "mqttBroker": "localhost",
    "mqttPort": 1883,
    "mqttUser": "user",
    "mqttPass": "password",
    "mqttTopic": "meshcore",
    "debug": false
}
```

**Full configuration with all options:**

```json
{
    "connectionType": "tcp",
    "tcpHost": "192.168.1.100",
    "tcpPort": 5000,
    "mqttBroker": "localhost",
    "mqttPort": 1883,
    "mqttUser": "user",
    "mqttPass": "password",
    "mqttTopic": "meshcore",
    "debug": false
}
```

Then run:

```bash
$ pnpm start
```

### Environment Variables

| Variable                   | Description                  | Default               |
| -------------------------- | ---------------------------- | --------------------- |
| `MESHCORE_CONFIG`          | Path to JSON config file     | `config.json`         |
| `MESHCORE_CONNECTION_TYPE` | Connection type (serial/tcp) | `serial`              |
| `MESHCORE_PORT`            | Serial port                  | (required for serial) |
| `MESHCORE_BAUDRATE`        | Serial baudrate              | `115200`              |
| `MESHCORE_TCP_HOST`        | TCP host                     | (required for tcp)    |
| `MESHCORE_TCP_PORT`        | TCP port                     | `5000`                |
| `MESHCORE_MQTT_BROKER`     | MQTT broker hostname         | (required)            |
| `MESHCORE_MQTT_PORT`       | MQTT broker port             | `1883`                |
| `MESHCORE_MQTT_USER`       | MQTT username                | -                     |
| `MESHCORE_MQTT_PASS`       | MQTT password                | -                     |
| `MESHCORE_MQTT_TOPIC`      | MQTT topic prefix            | `meshcore`            |
| `MESHCORE_DEBUG`           | Enable debug logging         | `false`               |

Example (Serial connection):

```bash
$ MESHCORE_PORT=/dev/ttyUSB0 MESHCORE_MQTT_BROKER=localhost pnpm start
```

Example (TCP connection):

```bash
$ MESHCORE_CONNECTION_TYPE=tcp MESHCORE_TCP_HOST=192.168.1.100 MESHCORE_MQTT_BROKER=localhost pnpm start
```

Or with Docker (Serial):

```bash
$ docker run --device=/dev/ttyUSB0 -e MESHCORE_PORT=/dev/ttyUSB0 -e MESHCORE_MQTT_BROKER=mqtt.example.com ghcr.io/jackcoble/meshcore-mqtt
```

Or with Docker (TCP):

```bash
$ docker run -e MESHCORE_CONNECTION_TYPE=tcp -e MESHCORE_TCP_HOST=192.168.1.100 -e MESHCORE_MQTT_BROKER=mqtt.example.com ghcr.io/jackcoble/meshcore-mqtt
```

> [!NOTE]
> For serial connections, the `--device` flag is required to pass through the serial device to the container. Replace `/dev/ttyUSB0` with your actual device path.

> [!WARNING]
> Docker on macOS does not support USB device passthrough for serial connections. The `--device` flag will not work because Docker Desktop runs containers inside a Linux VM that cannot access host USB devices. On macOS, either use TCP connection mode or run the bridge natively for serial connections. See [Docker's documentation on hardware access](https://docs.docker.com/desktop/troubleshoot-and-support/faqs/general/#can-i-pass-through-a-usb-device-to-a-container) for more details.

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0).
You may copy, distribute, and modify the software under the terms of the GPL-3.0.

See the [LICENSE](LICENSE) file for full details.
