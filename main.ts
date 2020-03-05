/**
* Jakub Smejkal, Karel Blavka @ HARDWARIO s.r.o.
* February 2020
* https://github.com/SmejkalJakub/pxt-HARDWARIO
* Development environment specifics:
* Written in Microsoft PXT
*
* This code is released under the [MIT License](http://opensource.org/licenses/MIT).
* Please review the LICENSE.md file included with this example. If you have any questions 
* or concerns with licensing, please contact support@hardwario.com.
* Distributed as-is; no warranty is given.
*/

enum RelayState {
    On,
    Off
}

enum BatteryModuleType {
    Mini,
    Standard
}

const luxAddress = 68;
const tempAddress = 72;
const humidityAddress = 64;
const barometerAddress = 96;
const tca9534aAddress = 59;
const sgp30Address = 88;
const co2Address = 56;
const sc16is740Address = 77;

//% color=#e30427 icon="\uf2db" block="HARDWARIO"
namespace hardwario {

    let tca9534aInitialized: boolean = false;
    let humidityInititialized: boolean = false;
    let tempInitialized: boolean = false;
    let opt3001Initialized: boolean = false;
    let mpl3115a2Initialized: boolean = false;
    let motionInit: boolean = false;
    let relayInit: boolean = false;
    let sgp30Initialized: boolean = false;


    let temperatureVar = 0;
    let humidityVar = 0;
    let lightIntensityVar = 0;
    let pressureVar = 0;
    let altitudeVar = 0;
    let tvocVar = 0;


    /**
    * Reads the current value of light intensity from the sensor
	    * Returns light intensity in lux. 
    */
    //%block="light intensity"
    export function lightIntensity(): number {
        if (!opt3001Initialized) {
            startLightMeasurement();
        }
        return Math.trunc(lightIntensityVar);
    }
    //%block="CO2"
    export function CO2(): number {
        let co2Pressure = 10124;
        let sensorState: Buffer = pins.createBuffer(23);

        let firstMeasurementDone = false;

        let length: number = 8;

    export function CO2() {
        let buf: Buffer;
        /**INIT */

        tca9534aInit(0x38);
        tca9534aWritePort(0x38, 0x00);
        tca9534aSetPortDirection(0x38, (~(1 << 0) & ~(1 << 4)) & (~(1 << 6)));
      
        basic.pause(1);

        tca9534aSetPortDirection(0x38, (~(1 << 0) & ~(1 << 4)));

        basic.pause(1);
        sc16is740Init(sc16is740Address);

        /**CHARGE */
        moduleCo2ChargeEnable(true);
        serial.writeLine("CHARGE");
        basic.pause(60000);
        serial.writeLine("AFTER CHARGE");
        moduleCo2ChargeEnable(false);

        while (true) {
            moduleCo2DeviceEnable(true);

            basic.pause(140);
            let value = 50;
            /**BOOT */
            while (value != 0) {
                buf = pins.createBufferFromArray([0x00])
        basic.pause(140);
        let value = 50;
        serial.writeLine("CYKLUS");
        while (value != 0) {
            buf = pins.createBufferFromArray([0x00])
                let port = i2cReadNumber(0x38, buf);
                value = ((port >> 7) & 0x01);

                basic.pause(10);
            }


            if (!firstMeasurementDone) {
                buf = pins.createBufferFromArray([0x00, 0xfe, 0x41, 0x00, 0x80, 0x01, 0x10, 0x28, 0x7e]);
                length = 8;
                serial.writeLine("FIRST");
            }
            else {
                buf = pins.createBuffer(34);
                buf.fill(0);
                buf[0] = 0xfe;
                buf[1] = 0x41;
                buf[2] = 0x00;
                buf[3] = 0x80;
                buf[4] = 0x1a;
                buf[5] = 0x20;

                for (let i = 0; i < 23; i++) {
                    buf[i + 6] = sensorState[i];
                }
                buf[29] = co2Pressure >> 8;
                buf[30] = co2Pressure;

                let crc16 = lp8CalculateCrc16(buf, 31);

                buf[31] = crc16;
                buf[32] = crc16 >> 8;

                buf.shift(-1);

                buf[0] = 0x00;

                length = 33;

            }
            moduleCo2UartEnable(true);
            pins.i2cWriteBuffer(sc16is740Address, buf);
            basic.pause(120);

            /**BOOT READ */

            buf = pins.createBufferFromArray([0x09 << 3]);

            let spacesAvaliable = i2cReadNumber(sc16is740Address, buf);

            pins.i2cWriteNumber(sc16is740Address, 0x00, NumberFormat.Int8LE);

            let readBuf: Buffer = pins.i2cReadBuffer(sc16is740Address, 4);

            if (readBuf[0] != 0xfe) {
                serial.writeLine("0 ERROR");
                return -1;
            }
            if (readBuf[1] != 0x41) {
                serial.writeLine("1 ERROR");

                return -1;
            }
            if (lp8CalculateCrc16(readBuf, 4) != 0) {
                serial.writeLine("CRC ERROR");
                return -1;
            }
            basic.pause(70);

            /**MEASURE */
            value = 50;
            while (value == 0) {
                buf = pins.createBufferFromArray([0x00])

                let port = i2cReadNumber(0x38, buf);

                value = ((port >> 7) & 0x01);
                serial.writeLine("VALUE DRUHA: " + value);
                basic.pause(10);
            }


            buf = pins.createBufferFromArray([0x00, 0xfe, 0x44, 0x00, 0x80, 0x2c, 0x79, 0x39]);

            moduleCo2UartEnable(true);
            pins.i2cWriteBuffer(sc16is740Address, buf);
            basic.pause(120);

            /**MEASURE READ */
            buf = pins.createBufferFromArray([0x09 << 3]);

            spacesAvaliable = i2cReadNumber(sc16is740Address, buf);

            pins.i2cWriteNumber(sc16is740Address, 0x00, NumberFormat.Int8LE);

            readBuf = pins.i2cReadBuffer(sc16is740Address, 49);

            moduleCo2UartEnable(false);

            moduleCo2DeviceEnable(false);

            if (readBuf[0] != 0xfe) {
                return -1;
            }

            if (readBuf[1] != 0x44) {
                return -1;
            }

            if (lp8CalculateCrc16(readBuf, 49) != 0) {
                return -1;
            }
            if ((readBuf[3 + 0xa7 - 0x80] & 0xdd) != 0) {
                return -1;
            }

            if ((readBuf[3 + 0xa6 - 0x80] & 0xf7) != 0) {
                return -1;
            }

            for (let i = 0; i < 23; i++) {
                sensorState[i] = readBuf[i + 4];
            }

            firstMeasurementDone = true;

            let concentration = readBuf[3 + 0x9a - 0x80] << 8;
            concentration |= readBuf[(3 + 0x9a - 0x80) + 1];

            serial.writeLine("CO2");
            serial.writeNumber(concentration);

            return concentration;

            basic.pause(3000);

            value = ((port >> 7) & 0x01);
            serial.writeLine("VALUE: " + value);
            basic.pause(10);
        }
    }
    /**
    * Reads the current value of temperature from the sensor
	    * Returns temperature in celsius. 
    */
    //%block="temperature"
    export function temperature(): number {
        if (!tempInitialized) {
            startTempMeasurement();
        }
        return Math.trunc(temperatureVar);

    }

    /**
    * Reads the current value of humidity from the sensor
	    * Returns relative humidity in percent. 
    */
    //%block="humidity"
    export function humidity(): number {

        if (!humidityInititialized) {
            startHumidityMeasurement();
        }
        return Math.trunc(humidityVar);
    }
    /**
    * Reads the current altitude from the barometer sensor
	    * Returns meters above sea level.
    */
    //%block="altitude"
    export function altitude(): number {
        let buf: Buffer;
        if (!mpl3115a2Initialized) {
            buf = pins.createBufferFromArray([0x26, 0x04]);
            pins.i2cWriteBuffer(barometerAddress, buf);
            basic.pause(1500);
            mpl3115a2Initialized = true;
        }

        buf = pins.createBufferFromArray([0x26, 0xb8]);
        pins.i2cWriteBuffer(barometerAddress, buf);

        buf = pins.createBufferFromArray([0x13, 0x07]);
        pins.i2cWriteBuffer(barometerAddress, buf);

        buf = pins.createBufferFromArray([0x26, 0xba]);
        pins.i2cWriteBuffer(barometerAddress, buf);
        basic.pause(1500);

        buf.fill(0);
        pins.i2cWriteBuffer(barometerAddress, buf);

        let alt_status = pins.i2cReadNumber(barometerAddress, 1);

        serial.writeLine('altitude');
        if (alt_status == 0x0e) {
            buf = pins.createBufferFromArray([0x01]);
            pins.i2cWriteBuffer(barometerAddress, buf);

            let resultBuf: Buffer = pins.i2cReadBuffer(barometerAddress, 5);

            let firstParam: NumberFormat.UInt32BE = resultBuf[1] << 24;

            let secondParam: NumberFormat.UInt32BE = resultBuf[2] << 16;

            let thirdParam: NumberFormat.UInt32BE = (resultBuf[3] & 0xf0);

            thirdParam = thirdParam << 8;

            let out_pa: NumberFormat.Int32BE = firstParam | secondParam | thirdParam;

            let meter: NumberFormat.Float32BE = (out_pa) / 65536.0;

            return Math.trunc(meter);

        }
        return -1;
        serial.writeLine(" ");
        basic.pause(2000);
    }
    /**
    * Reads the current atmospheric pressure from the barometer sensor
	    * Returns atmospheric pressure in pascals.
    */
    //%block="pressure"
    export function pressure(): number {

        let buf: Buffer;

        if (!mpl3115a2Initialized) {
            buf = pins.createBufferFromArray([0x26, 0x04]);
            pins.i2cWriteBuffer(barometerAddress, buf);
            basic.pause(1500);
            mpl3115a2Initialized = true;
        }

        buf = pins.createBufferFromArray([0x26, 0x38]);
        pins.i2cWriteBuffer(barometerAddress, buf);

        buf = pins.createBufferFromArray([0x13, 0x07]);
        pins.i2cWriteBuffer(barometerAddress, buf);

        buf = pins.createBufferFromArray([0x26, 0x3a]);
        pins.i2cWriteBuffer(barometerAddress, buf);
        basic.pause(1500);

        buf.fill(0);
        pins.i2cWriteBuffer(barometerAddress, buf);

        let pre_status = i2cReadNumber(barometerAddress, buf)
        pins.i2cReadNumber(barometerAddress, 1);

        if (pre_status == 0x0e) {
            buf = pins.createBufferFromArray([0x01]);

            let resultBuf: Buffer = i2cReadBuffer(barometerAddress, buf, 5);

            let firstParam: NumberFormat.UInt32BE = resultBuf[1] << 16;

            let secondParam: NumberFormat.UInt32BE = resultBuf[2] << 8;

            let thirdParam: NumberFormat.UInt32BE = resultBuf[3];

            thirdParam = thirdParam << 8;


            let out_p: NumberFormat.Int32BE = firstParam | secondParam | thirdParam;

            let pascal: NumberFormat.Float32BE = (out_p) / 64.0;

            return Math.trunc(pascal);

        }
        return -1;
        serial.writeLine(" ");
        basic.pause(2000);
    }

    /**
    * Sets the state of bi-stable relay on the Relay Module to on/off
    */
    //%block="set relay state $state"
    export function setRelay(state: RelayState) {
        if (!relayInit) {
            tca9534aInit(59);

            tca9534aWritePort(59, ((1 << 6) | (1 << 4)));

            tca9534aSetPortDirection(59, 0x00);

            relayInit = true;
        }

        if (state == RelayState.On) {
            tca9534aWritePort(59, ((1 << 4) | (1 << 5)));
        }
        else {
            tca9534aWritePort(59, ((1 << 6) | (1 << 7)));
        }
        basic.pause(50);
        tca9534aWritePort(59, 0);

    }
    /**
    * Get battery voltage of the batteries in Battery Module. You have to choose if you have
    * standard(4 batteries) or mini(2 batteries) version of the Module
    */
    //%block="voltage on $type | battery module"
    export function batteryVoltage(type: BatteryModuleType): number {

        if (type == BatteryModuleType.Mini) {
            pins.digitalWritePin(DigitalPin.P1, 0);
            basic.pause(100);

            let result: number = pins.analogReadPin(AnalogPin.P0);

            pins.analogWritePin(AnalogPin.P1, 1023);
            serial.writeLine("RESULT: " + 3 / 1024 * result / 0.33);
            return (3 / 1024 * result / 0.33) + 0.1;
        }
        else {
            pins.digitalWritePin(DigitalPin.P1, 1);
            basic.pause(100);

            let result: number = pins.analogReadPin(AnalogPin.P0);

            pins.digitalWritePin(DigitalPin.P1, 0);
            return 3 / 1024 * result / 0.13;
        }
        basic.pause(3000);
    }
    //%block="VOC"
    export function VOC(): number {
        if (!sgp30Initialized) {
            startVOCMeasurement();
        }
        return Math.trunc(tvocVar);

    }
    /*
    //%block="motionDetectorTask $pin"
    export function motionDetectorTask(pin: DigitalPin) {
        serial.writeLine("START");
        basic.forever(function () {
            while (true) {

                if (!motionInit) {

                    serial.writeLine("INIT");
                    pins.setPull(pin, PinPullMode.PullNone);
                    motionInit = true;
                }

                let motion: number = pins.digitalReadPin(pin);
                serial.writeLine("Pohyb: " + motion);

                if (motion) {

                    serial.writeLine("motion detected");

                    pins.digitalWritePin(pin, 0);
                    basic.pause(100);
                    pins.digitalReadPin(pin);

                }
                basic.pause(100);
            }
        })
    }*/

    export function lcd() {
        tca9534aInit(60);
        tca9534aWritePort(60, ((1 << 0) | (1 << 7) | (1 << 2) | (1 << 4) | (1 << 5) | (1 << 6)));
        tca9534aSetPortDirection(60, (1 << 1) | (1 << 3));
        pins.spiFrequency(1000000);
        pins.spiFormat(8, 3);

        let port = 245;
        port &= ~(1 << 7);
        port |= 1 << 7;

        i2cMemoryWrite(0, 0x01, port);



    }

    /**
     * Helper functions
     */

    function sc16is740ResetFifo(fifo: number) {
        let register_fcr: number;

        register_fcr = fifo | 0x01;

        i2cMemoryWrite(co2Address, 0x02 << 3, register_fcr);
    }

    function moduleCo2UartEnable(state: boolean) {
        if (state) {
            sc16is740ResetFifo(2);
        }
    }

    function moduleCo2UartWrite(buf: Buffer, length: number) {
        sca16is740Write(buf, length);
    }

    function moduleCo2UartRead(buf: Buffer, length: number) {
        sc16is740Read(buf, length);
    }

    function sc16is740Read(buf: Buffer, length: number) {

    }

    function sca16is740Write(buf: Buffer, length: number) {
        let spacesAvailable: number;
        if (length > 64) {
            return 0;
        }

        spacesAvailable = sc16is740GetSpacesAvailable();

        if (spacesAvailable < length) {
            return 0;
        }
        pins.i2cWriteBuffer(sc16is740Address, buf);

        return length;
    }

    function sc16is740GetSpacesAvailable(): number {
        //return i2c(sc16is740Address, 0x08 << 3, 0); 
        return 64;
    }


    function moduleCo2Uartead() {

    }

    function sc16is740Init(address: number) {
        i2cMemoryWrite(address, 0x03 << 3, 0x80);

        i2cMemoryWrite(address, 0x00 << 3, 0x58);

        i2cMemoryWrite(address, 0x01 << 3, 0x00);

        i2cMemoryWrite(address, 0x03 << 3, 0xbf);

        i2cMemoryWrite(address, 0x02 << 3, 0x10);

        i2cMemoryWrite(address, 0x03 << 3, 0x07);

        i2cMemoryWrite(address, 0x02 << 3, 0x07);

        i2cMemoryWrite(address, 0x01 << 3, 0x11);
    }

    function moduleCo2DeviceEnable(state: boolean) {
        let direction: number = (~(1 << 0) & ~(1 << 4));

        if (state) {
            direction &= (~(1 << 2)) & (~(1 << 1)) & (~(1 << 3));
        }

        tca9534aSetPortDirection(0x38, direction);
    }

    function moduleCo2ChargeEnable(state: boolean) {
        let direction: number = (~(1 << 0) & ~(1 << 4));

        if (state) {
            direction &= (~(1 << 2)) & (~(1 << 1));
        }

        return tca9534aSetPortDirection(0x38, direction);
    }

    function i2cMemoryWrite(address: number, regAddress: number, data: number) {
        let buf: Buffer = pins.createBufferFromArray([regAddress, data]);
        pins.i2cWriteBuffer(address, buf);
    }


    function sgp30CalculateCrc(buffer: number[], length: number): NumberFormat.UInt8LE {
        let crc: number = 0xff;

        for (let i = 0; i < length; i++) {
            crc ^= buffer[i];

            for (let j = 0; j < 8; j++) {
                if ((crc & 0x80) != 0) {
                    crc = (crc << 1) ^ 0x31;
                }
                else {
                    crc <<= 1;
                }
            }
        }

        return crc;
    }

    function lp8CalculateCrc16(buffer: Buffer, length: number): number {

        let crc16: number = 0xffff;

        for (let j = 0; j < length; j++) {
            crc16 ^= buffer[j];

            for (let i = 0; i < 8; i++) {
                if ((crc16 & 1) != 0) {
                    crc16 >>= 1;
                    crc16 ^= 0xa001;
                }
                else {
                    crc16 >>= 1;
                }
            }
        }

        return crc16;
    }

    function bcLs013b7dh03Reverse(b: number): number {
        b = (b & 0xf0) >> 4 | (b & 0x0f) << 4;
        b = (b & 0xcc) >> 2 | (b & 0x33) << 2;
        b = (b & 0xaa) >> 1 | (b & 0x55) << 1;

        return b;
    }

    function startVOCMeasurement() {
        let buf: Buffer;
        let outBuf: Buffer

        if (!sgp30Initialized) {
            buf = pins.createBufferFromArray([0x20, 0x2f]);
            outBuf = i2cReadBuffer(sgp30Address, buf, 3);

            buf = pins.createBufferFromArray([0x20, 0x03]);
            pins.i2cWriteBuffer(sgp30Address, buf);

            sgp30Initialized = true;
        }

        control.inBackground(function () {
            while (true) {
                let crcBuf: number[] = [0 >> 8, 0];
                let crc = sgp30CalculateCrc(crcBuf, 2);

                buf = pins.createBufferFromArray([0x20, 0x61, 0 >> 8, 0, crc]);
                pins.i2cWriteBuffer(sgp30Address, buf);
                basic.pause(30);

                buf = pins.createBufferFromArray([0x20, 0x08]);
                pins.i2cWriteBuffer(sgp30Address, buf);
                basic.pause(30);

                outBuf = pins.i2cReadBuffer(sgp30Address, 6);

                let co2eq = (outBuf[0] << 8) | outBuf[1];
                let tvoc = (outBuf[3] << 8) | outBuf[4];

                tvocVar = tvoc;
                basic.pause(3000);
            }
        })
    }

    function startLightMeasurement() {
        let buf: Buffer;

        if (!opt3001Initialized) {
            buf = pins.createBufferFromArray([0x01, 0xc8, 0x10]);
            pins.i2cWriteBuffer(luxAddress, buf); //Init
            basic.pause(50);
            opt3001Initialized = true;
        }

        control.inBackground(function () {
            let lux_status: number;

            while (true) {
                buf = pins.createBufferFromArray([0x01, 0xca, 0x10]);
                pins.i2cWriteBuffer(luxAddress, buf);
                basic.pause(1000);

                buf = pins.createBufferFromArray([0x01]);
                pins.i2cWriteBuffer(luxAddress, buf);

                lux_status = pins.i2cReadNumber(luxAddress, NumberFormat.UInt16BE);
                serial.writeLine("Lux status: " + lux_status);
                if ((lux_status & 0x0680) == 0x0080) {

                    buf = pins.createBufferFromArray([0x00]);
                    pins.i2cWriteBuffer(luxAddress, buf);

                    let raw: number = pins.i2cReadNumber(luxAddress, NumberFormat.UInt16BE);

                    let exponent: number = raw >> 12;

                    let fractResult: number = raw & 0xfff;

                    let shiftedExponent: number = 1 << exponent;

                    let lux: number = 0.01 * shiftedExponent * fractResult;
                    lightIntensityVar = lux;
                    basic.pause(3000);

                }
            }
        })
    }

    function startTempMeasurement() {
        tempInitialized = true;
        let temp;
        let tmp112;
        control.inBackground(function () {
            let buf: Buffer;
            while (true) {
                buf = pins.createBufferFromArray([0x01, 0x80]);
                pins.i2cWriteBuffer(tempAddress, buf);

                buf.fill(0);
                pins.i2cWriteBuffer(tempAddress, buf);

                temp = pins.i2cReadBuffer(tempAddress, 2);
                tmp112 = temp[0] + (temp[1] / 100)

                serial.writeLine("TEMP");
                serial.writeNumber(tmp112);
                temp = tmp112;
                basic.pause(2000);
            }
        })
    }

    function startHumidityMeasurement() {
        humidityInititialized = true;
        control.inBackground(function () {
            let buf: Buffer;
            while (true) {
                buf = pins.createBufferFromArray([0xfe]);
                pins.i2cWriteBuffer(humidityAddress, buf);
                basic.pause(20);

                buf = pins.createBufferFromArray([0xf5]);
                pins.i2cWriteBuffer(humidityAddress, buf);
                basic.pause(50);

                let hum_sht = pins.i2cReadBuffer(humidityAddress, 2);

                serial.writeLine('humidity')
                let hum_sht_raw = ((hum_sht[0]) * 256) + (hum_sht[1])
                let hum_sht_per = -6 + 125 * hum_sht_raw / 65536
                serial.writeNumber(hum_sht_per);

                serial.writeLine(" ");
                humidityVar = hum_sht_per;
                basic.pause(2000);
            }
        })

    }

    function tca9534aInit(i2cAddress: number) {
        if (!tca9534aInitialized) {
            let buf: Buffer = pins.createBufferFromArray([0x03]);
            let returnVal: number;

            returnVal = i2cReadNumber(i2cAddress, buf);

            buf = pins.createBufferFromArray([0x01]);
            returnVal = i2cReadNumber(i2cAddress, buf);

            tca9534aInitialized = true;
        }
    }

    function tca9534aWritePort(address: number, value: NumberFormat.UInt8BE) {
        let buf: Buffer = pins.createBufferFromArray([0x01, value]);
        let returnVal: number;

        returnVal = i2cReadNumber(address, buf);

    }

    function tca9534aSetPortDirection(address: number, direction: NumberFormat.UInt8BE) {
        let buf: Buffer = pins.createBufferFromArray([0x03, direction]);
        let returnVal: number;
        returnVal = i2cReadNumber(address, buf);
    }

    function i2cReadNumber(address: number, buffer: Buffer): number {

        pins.i2cWriteBuffer(address, buffer);
        return pins.i2cReadNumber(address, NumberFormat.Int8BE);
    }

    function i2cReadBuffer(address: number, buffer: Buffer, size: number): Buffer {
        pins.i2cWriteBuffer(address, buffer);
        return pins.i2cReadBuffer(address, size);
    }
}
