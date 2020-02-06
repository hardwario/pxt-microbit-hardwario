namespace HARDWARIO {
    //%block
    export function getLight() {

        pins.i2cWriteBuffer(68, pins.createBufferFromArray([0x01, 0xc8, 0x10])); //Init
        basic.pause(50);

        let andBuf: number = 0x0608;
        let controledBuf: Buffer = pins.createBufferFromArray([0x00, 0x80]);

        let buf: Buffer = pins.createBufferFromArray([0x01, 0xca, 0x10]);
        pins.i2cWriteBuffer(68, buf);
        basic.pause(1000);

        buf = pins.createBufferFromArray([0x01]);
        pins.i2cWriteBuffer(68, buf);
        let lux_status: Buffer = pins.i2cReadBuffer(68, 2);

        if ((lux_status.getNumber(NumberFormat.UInt8LE, 0) & andBuf) == 0x0080) {
            buf = pins.createBufferFromArray([0x00]);
            pins.i2cWriteBuffer(68, buf);
            let lux_data = pins.i2cReadBuffer(68, 2);
            console.log("Změřeno");
        }
        else {
            console.log("Nezměřeno");
        }
    }
    //%block
    export function getCO2() {

    }

    //%block
    export function getTemperature() {

    }

    //%block
    export function getHumidity() {

    }
}

