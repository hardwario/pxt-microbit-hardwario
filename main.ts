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
        let buf: Buffer;
        tca9534aInit(0x38);
        tca9534aWritePort(0x00);
        tca9534aSetPortDirection((~(1 << 0) & ~(1 << 4)) & (~(1 << 6)));

        for (let i = 0; i < 100; i++) {
            continue;
        }

        tca9534aSetPortDirection((~(1 << 0) & ~(1 << 4)));

        for (let i = 0; i < 1000; i++) {
            continue;
        }
        sc16is740Init(0x4d);

        moduleCo2ChargeEnable(true);
        basic.pause(60000);

        moduleCo2ChargeEnable(false);

        moduleCo2DeviceEnable(true);

        basic.pause(140);
        let value = 50;
        while (value != 0) {
            buf = pins.createBufferFromArray([0x00])

            let port = readNumberFromI2C(0x38, buf, NumberFormat.Int8LE);

            value = ((port >> 7) & 0x01);
            serial.writeLine("VALUE: " + value);
        }
        return 1;

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

        let pre_status = readNumberFromI2C(barometerAddress, buf, NumberFormat.Int8LE)
        pins.i2cReadNumber(barometerAddress, 1);

        if (pre_status == 0x0e) {
            buf = pins.createBufferFromArray([0x01]);

            let resultBuf: Buffer = readBufferFromI2C(barometerAddress, buf, 5);

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

            tca9534aWritePort(((1 << 6) | (1 << 4)));

            tca9534aSetPortDirection(0x00);

            relayInit = true;
        }

        if (state == RelayState.On) {
            tca9534aWritePort(((1 << 4) | (1 << 5)));
        }
        else {
            tca9534aWritePort(((1 << 6) | (1 << 7)));
        }
        basic.pause(50);
        tca9534aWritePort(0);

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

            pins.digitalWritePin(DigitalPin.P1, 1);
            return result;
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
        tca9534aWritePort(((1 << 0) | (1 << 7) | (1 << 2) | (1 << 4) | (1 << 5) | (1 << 6)));
        tca9534aSetPortDirection((1 << 1) | (1 << 3));
        pins.spiFrequency(1000000);
        pins.spiFormat(8, 3);

        245, 7, 1

        let port = 245;
        port &= ~(1 << 7);
        port |= 1 << 7;

        i2cMemoryWrite(0, 0x01, port);



    }

    /**
     * Helper functions
     */


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

        tca9534aSetPortDirection(direction);
    }

    function moduleCo2ChargeEnable(state: boolean) {
        let direction: number = (~(1 << 0) & ~(1 << 4));

        if (state) {
            direction &= (~(1 << 2)) & (~(1 << 1));
        }

        return tca9534aSetPortDirection(direction);
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
            outBuf = readBufferFromI2C(sgp30Address, buf, 3);

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

            returnVal = readNumberFromI2C(i2cAddress, buf, NumberFormat.UInt8BE);

            buf = pins.createBufferFromArray([0x01]);
            returnVal = readNumberFromI2C(i2cAddress, buf, NumberFormat.UInt8BE);

            tca9534aInitialized = true;
        }
    }

    function tca9534aWritePort(value: NumberFormat.UInt8BE) {
        let buf: Buffer = pins.createBufferFromArray([0x01, value]);
        let returnVal: number;

        returnVal = readNumberFromI2C(59, buf, NumberFormat.UInt8BE);

    }

    function tca9534aSetPortDirection(direction: NumberFormat.UInt8BE) {
        let buf: Buffer = pins.createBufferFromArray([0x03, direction]);
        let returnVal: number;
        returnVal = readNumberFromI2C(59, buf, NumberFormat.UInt8BE);
    }

    function readNumberFromI2C(address: number, buffer: Buffer, format: NumberFormat): number {

        pins.i2cWriteBuffer(address, buffer);
        return pins.i2cReadNumber(address, format);
    }

    function readBufferFromI2C(address: number, buffer: Buffer, size: number): Buffer {
        pins.i2cWriteBuffer(address, buffer);
        return pins.i2cReadBuffer(address, size);
    }
}
