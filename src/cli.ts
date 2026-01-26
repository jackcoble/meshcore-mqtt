import { Command } from "commander";
import { version } from "../package.json";

const program = new Command();

program
    .name("meshcore-mqtt")
    .description("CLI tool to interact with MeshCore to MQTT bridge")
    .version(version)
    .option("-c, --config <path>", "Path to JSON config file", "config.json")
    .option(
        "-t, --connection-type <type>",
        "Connection type: serial or tcp (default: serial)"
    )
    .option("-p, --port <port>", "Serial port (e.g., /dev/ttyUSB0 or COM3)")
    .option("-b, --baudrate <rate>", "Serial baudrate")
    .option("--tcp-host <host>", "TCP host for TCP connection")
    .option("--tcp-port <port>", "TCP port for TCP connection (default: 5000)")
    .option("-m, --mqtt-broker <broker>", "MQTT broker hostname or IP")
    .option("--mqtt-port <port>", "MQTT broker port")
    .option("--mqtt-user <user>", "MQTT username")
    .option("--mqtt-pass <password>", "MQTT password")
    .option("--mqtt-topic <topic>", "MQTT topic prefix")
    .option("--debug", "Enable debug logging")
    .parse(process.argv);

export default program;
