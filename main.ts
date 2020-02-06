namespace HARDWARIO {
    //%block
    export function getLight() {

        let buf: Buffer;
        buf.setNumber(NumberFormat.UInt8LE, 0, 0x01c810);
        console.log("buffer" + buf.getNumber(NumberFormat.UInt8LE, 0));
        pins.i2cWriteBuffer(68, buf); //Init

        basic.pause(100);

        let andBuf: number = 0x0608;
        let controledBuf: Buffer = pins.createBufferFromArray([0x00, 0x80]);

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
            basic.showLeds(`
                . . . . .
                . . . . #
                . . . # .
                # . # . .
                . # . . .
                `)
        }
        else {
            console.log("Nezměřeno");
            basic.showLeds(`
                # . . . #
                . # . # .
                . . # . .
                . # . # .
                # . . . #
                `)
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

