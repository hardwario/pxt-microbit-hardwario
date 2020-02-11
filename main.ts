enum relayState {
    on,
    off
}



namespace HARDWARIO {

    let tca9534a_initialized: boolean = false;
    let opt3001_initialized: boolean = false;
    let mpl3115a2_initialized: boolean = false;

    //%block
    export function getLight() : number {
        
        let buf: Buffer;

        if(!opt3001_initialized)
        {
            buf = pins.createBufferFromArray([0x01, 0xc8, 0x10]);
            pins.i2cWriteBuffer(68, buf); //Init
            basic.pause(50);
            opt3001_initialized = true;
        }

        buf = pins.createBufferFromArray([0x01, 0xca, 0x10]);
        pins.i2cWriteBuffer(68, buf);
        basic.pause(1000);

        buf = pins.createBufferFromArray([0x01]);
        pins.i2cWriteBuffer(68, buf);

        let lux_status: number = pins.i2cReadNumber(68, NumberFormat.UInt16BE);
        serial.writeLine("Lux status: " + lux_status);
        if ((lux_status & 0x0680) == 0x0080) {

            buf = pins.createBufferFromArray([0x00]);
            pins.i2cWriteBuffer(68, buf);

            let raw: number = pins.i2cReadNumber(68, NumberFormat.UInt16BE);

            let exponent: number = raw >> 12;

            let fractResult: number = raw & 0xfff;

            let shiftedExponent: number = 1 << exponent;

            let lux: number = 0.01 * shiftedExponent * fractResult;
            serial.writeLine("LUX: " + lux);
            return lux;

        }
        return -1;

    }
    //%block
    export function getCO2() {

    }

    //%block="getTemperature"
    export function getTemperature() : number {

        let buf: Buffer = pins.createBufferFromArray([0x01, 0x80]);
        pins.i2cWriteBuffer(72, buf);

        buf.fill(0);
        pins.i2cWriteBuffer(72, buf);

        let temp = pins.i2cReadBuffer(72, 2);
        let tmp112 = temp[0] + (temp[1] / 100)

        serial.writeLine("TEMP");
        serial.writeNumber(tmp112);
        return tmp112;
        basic.pause(2000);
    }

    //%block="getHumidity"
    export function getHumidity() : number {

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
        return(hum_sht_per);
        basic.pause(2000);
    }

    //%block="getAltitude"
    export function getAltitude() : number {
        let buf: Buffer;
        if(!mpl3115a2_initialized)
        {
            buf = pins.createBufferFromArray([0x26, 0x04]);
            pins.i2cWriteBuffer(96, buf);
            basic.pause(1500);
            mpl3115a2_initialized = true;
        }

        buf = pins.createBufferFromArray([0x26, 0xb8]);
        pins.i2cWriteBuffer(96, buf);

        buf = pins.createBufferFromArray([0x13, 0x07]);
        pins.i2cWriteBuffer(96, buf);

        buf = pins.createBufferFromArray([0x26, 0xba]);
        pins.i2cWriteBuffer(96, buf);
        basic.pause(1500);

        buf.fill(0);
        pins.i2cWriteBuffer(96, buf);

        let alt_status = pins.i2cReadNumber(96, 1);

        serial.writeLine('altitude');
        if (alt_status == 0x0e) {
            buf = pins.createBufferFromArray([0x01]);
            pins.i2cWriteBuffer(96, buf);

            let resultBuf: Buffer = pins.i2cReadBuffer(96, 5);
            serial.writeLine("resultBuf[0]: " + resultBuf[0]);
            serial.writeLine("resultBuf[1]: " + resultBuf[1]);
            serial.writeLine("resultBuf[2]: " + resultBuf[2]);
            serial.writeLine("resultBuf[3]: " + resultBuf[3]);
            serial.writeLine("resultBuf[4]: " + resultBuf[4]);

            let firstParam: NumberFormat.UInt32BE = resultBuf[0] << 24;

            let secondParam: NumberFormat.UInt32BE = resultBuf[1] << 16;

            let thirdParam: NumberFormat.UInt32BE = (resultBuf[2] & 0xf0);

            thirdParam = thirdParam << 8;

            let out_pa: NumberFormat.Int32BE = firstParam | secondParam | thirdParam;

            let meter: NumberFormat.Float32BE = (out_pa) / 65536.0;

            serial.writeLine("altitude: " + meter);
            return meter;

        }
        return -1;
        serial.writeLine(" ");
        basic.pause(2000);
    }

    //%block="getPressure"
    export function getPressure() : number {

        let buf: Buffer;
        
        if (!mpl3115a2_initialized) {
            buf = pins.createBufferFromArray([0x26, 0x04]);
            pins.i2cWriteBuffer(96, buf);
            basic.pause(1500);
            mpl3115a2_initialized = true;
        }

        buf = pins.createBufferFromArray([0x26, 0x38]);
        pins.i2cWriteBuffer(96, buf);

        buf = pins.createBufferFromArray([0x13, 0x07]);
        pins.i2cWriteBuffer(96, buf);

        buf = pins.createBufferFromArray([0x26, 0x3a]);
        pins.i2cWriteBuffer(96, buf);
        basic.pause(1500);

        buf.fill(0);
        pins.i2cWriteBuffer(96, buf);

        let pre_status = pins.i2cReadNumber(96, 1);

        serial.writeLine('pressure');
        if (pre_status == 0x0e) {
            buf = pins.createBufferFromArray([0x01]);
            pins.i2cWriteBuffer(96, buf);

            let resultBuf: Buffer = pins.i2cReadBuffer(96, 5);
            serial.writeLine("resultBuf[0]: " + resultBuf[0]);
            serial.writeLine("resultBuf[1]: " + resultBuf[1]);
            serial.writeLine("resultBuf[2]: " + resultBuf[2]);
            serial.writeLine("resultBuf[3]: " + resultBuf[3]);
            serial.writeLine("resultBuf[4]: " + resultBuf[4]);

            let firstParam: NumberFormat.UInt32BE = resultBuf[4] << 16;

            let secondParam: NumberFormat.UInt32BE = resultBuf[3] << 8;

            let thirdParam: NumberFormat.UInt32BE = resultBuf[2];

            thirdParam = thirdParam << 8;


            let out_p: NumberFormat.Int32BE = firstParam | secondParam | thirdParam;

            let pascal: NumberFormat.Float32BE = (out_p) / 64.0;

            serial.writeLine("pressure: " + pascal);
            return pascal;

        }
        return -1;
        serial.writeLine(" ");
        basic.pause(2000);
    }

    //%block="set relay state $state"
    export function setRelay(state: relayState) {
        tca9534a_init();
        if (state == relayState.on) {
            tca9534a_write_port(((1 << 4) | (1 << 5)));
        }
        else {
            tca9534a_write_port(((1 << 6) | (1 << 7)));
        }
    }

    function tca9534a_init() {
        if (!tca9534a_initialized) {
            let buf: Buffer = pins.createBufferFromArray([0x03]);
            pins.i2cWriteBuffer(59, buf);

            let returnVal: number = pins.i2cReadNumber(59, NumberFormat.UInt8BE);

            serial.writeLine("Direction: " + returnVal);

            buf = pins.createBufferFromArray([0x01]);
            pins.i2cWriteBuffer(59, buf);
            returnVal = pins.i2cReadNumber(59, NumberFormat.UInt8BE);

            serial.writeLine("OutputPort: " + returnVal);

            tca9534a_write_port(((1 << 6) | (1 << 4)));

            tca9534a_set_port_direction(0x00);

            tca9534a_initialized = true;
        }
    }

    function tca9534a_write_port(value: NumberFormat.UInt8BE) {
        let buf: Buffer = pins.createBufferFromArray([0x01, value]);
        pins.i2cWriteBuffer(59, buf);

        let returnVal: number;

        returnVal = pins.i2cReadNumber(59, NumberFormat.UInt8BE);

        serial.writeLine("OutputPort: " + returnVal);
    }

    function tca9534a_set_port_direction(direction: NumberFormat.UInt8BE) {
        let buf: Buffer = pins.createBufferFromArray([0x03, direction]);
        pins.i2cWriteBuffer(59, buf);

        let returnVal: number;

        returnVal = pins.i2cReadNumber(59, NumberFormat.UInt8BE);

        serial.writeLine("DIRECTION: " + returnVal);
    }
}

