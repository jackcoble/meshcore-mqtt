import { Logger } from "pino";
import { ITransport } from "./transport";
import { SerialTransport, SerialTransportConfig } from "./serial.transport";
import { TcpTransport, TcpTransportConfig } from "./tcp.transport";

/**
 * Factory for creating transport instances
 */
export class TransportFactory {
    static createSerial(
        config: SerialTransportConfig,
        logger: Logger
    ): ITransport {
        return new SerialTransport(config, logger);
    }

    static createTcp(config: TcpTransportConfig, logger: Logger): ITransport {
        return new TcpTransport(config, logger);
    }
}
