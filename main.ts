namespace HARDWARIO {
    //%block
    export function getLight() {
        serial.writeLine("START");
        basic.pause(1000);

        let buf: Buffer = pins.createBufferFromArray([0x01, 0xca, 0x10]);
        let lux_status: Buffer = pins.createBuffer(4);
        pins.i2cWriteBuffer(68, buf); //Init
        serial.writeBuffer(buf);
        serial.writeLine("dalsi");

        basic.pause(50);

        buf(NumberFormat.UInt32BE, 0, 0x01ca10);
        pins.i2cWriteNumber(68, buf.getNumber(NumberFormat.UInt32BE, 0), NumberFormat.UInt32BE, false);
        basic.pause(1000);

        buf.fill(0);
        buf.setNumber(NumberFormat.UInt32BE, 0, 0x01);
        pins.i2cWriteNumber(68, buf.getNumber(NumberFormat.UInt32BE, 0), NumberFormat.UInt32BE, false);

        lux_status = pins.i2cReadBuffer(68, 2);
        serial.writeNumber(lux_status.getNumber(NumberFormat.UInt32BE, 0));
        if ((lux_status.getNumber(NumberFormat.UInt32BE, 0) & 0x0680) == 0x0080) {
            console.log("Změřeno");
            buf = pins.createBufferFromArray([0x00]);
            pins.i2cWriteBuffer(68, buf);
            let lux_data = pins.i2cReadBuffer(68, 2);
        }

    }
    //%block
    export function getCO2() {

    }

    //%block
    export function getTemperature() {
        let buf: Buffer = pins.createBufferFromArray([0x01, 0x80]);
        pins.i2cWriteBuffer(72, buf);

        buf.fill(0);
        pins.i2cWriteBuffer(72, buf);

        let temp = pins.i2cReadBuffer(72, 2);
        let tmp112 = temp[0] + (temp[1] / 100)

        serial.writeNumber(tmp112);
        serial.writeLine(" ");
        basic.pause(2000);
    }

    //%block
    export function getHumidity() {
        let buf: Buffer = pins.createBufferFromArray([0xfe]);
        pins.i2cWriteBuffer(64, buf);
        basic.pause(20);

        buf = pins.createBufferFromArray([0xf5]);
        pins.i2cWriteBuffer(64, buf);
        basic.pause(50);

        let hum_sht = pins.i2cReadBuffer(64, 2);

        serial.writeLine('humidity')
        let hum_sht_raw = ((hum_sht[0]) * 256) + (hum_sht[1])
        let hum_sht_per = -6 + 125 * hum_sht_raw / 65536
        serial.writeNumber(hum_sht_per);

        serial.writeLine(" ");
        basic.pause(2000);
    }

    //%block
    export function getAltitude() {
        let buf: Buffer = pins.createBufferFromArray([0x26, 0x04]);
        pins.i2cWriteBuffer(96, buf);
        basic.pause(1500);

        buf = pins.createBufferFromArray([0x26, 0xb8]);
        pins.i2cWriteBuffer(96, buf);

        buf = pins.createBufferFromArray([0x13, 0x07]);
        pins.i2cWriteBuffer(96, buf);

        buf = pins.createBufferFromArray([0x26, 0xba]);
        pins.i2cWriteBuffer(96, buf);
        basic.pause(1500);

        buf.fill(0);
        pins.i2cWriteBuffer(96, buf);

        let alt_status = pins.i2cReadBuffer(96, 1);

        serial.writeLine('altitude');
        serial.writeNumber(alt_status.getNumber(NumberFormat.UInt32BE, 0));

        serial.writeLine(" ");
        basic.pause(2000);
    }
}

