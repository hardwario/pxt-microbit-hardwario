/**
* Jakub Smejkal @ HARDWARIO s.r.o.
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

const luxAddress = 68;
const tempAddress = 72;
const humidityAddress = 64;
const barometerAddress = 96;
const tca9534aAddress = 59;

//% color=#e30427 icon="\uf2db" block="HARDWARIO"
namespace hardwario {

    let tca9534aInitialized: boolean = false;
    let humidityInititialized: boolean = false;
    let tempInitialized: boolean = false;
    let opt3001Initialized: boolean = false;
    let mpl3115a2Initialized: boolean = false;
    let motionInit: boolean = false;
    let relayInit: boolean = false;


    let temperature = 0;
    let humidity = 0;
    let lightIntensity = 0;
    let pressure = 0;
    let altitude = 0;


    /**
    * Reads the current value of light intensity from the sensor
	    * Returns light intensity in lux. 
    */
    //%block="getLight"
    export function getLight(): number {
        if (!opt3001Initialized) {
            startLightMeasurement();
        }
        return Math.trunc(lightIntensity);
    }
    //%block="getCO2"
    export function getCO2(): number {
        return 0;
    }
    /**
    * Reads the current value of temperature from the sensor
	    * Returns temperature in celsius. 
    */
    //%block="getTemperature"
    export function getTemperature(): number {
        if(!tempInitialized)
        {
            startTempMeasurement();
        }
        return Math.trunc(temperature);

    }

    /**
    * Reads the current value of humidity from the sensor
	    * Returns relative humidity in percent. 
    */
    //%block="getHumidity"
    export function getHumidity(): number {

        if(!humidityInititialized)
        {
            startHumidityMeasurement();
        }
        return Math.trunc(humidity);
    }
    /**
    * Reads the current altitude from the barometer sensor
	    * Returns meters above sea level.
    */
    //%block="getAltitude"
    export function getAltitude(): number {
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

            return meter;

        }
        return -1;
        serial.writeLine(" ");
        basic.pause(2000);
    }
    /**
    * Reads the current atmospheric pressure from the barometer sensor
	    * Returns atmospheric pressure in pascals.
    */
    //%block="getPressure"
    export function getPressure(): number {

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

        serial.writeLine('pressure');
        if (pre_status == 0x0e) {
            buf = pins.createBufferFromArray([0x01]);

            let resultBuf: Buffer = readBufferFromI2C(barometerAddress, buf, 5);

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

            return pascal;

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
    //%block="getVoltage"
    export function getBatteryVoltage() {
        serial.writeLine("START");
        pins.digitalWritePin(DigitalPin.P1, 0);
        basic.pause(100);

        let result: number = pins.analogReadPin(AnalogPin.P0);
        result <<= 6;
        serial.writeLine("BATTERY:" + ((result * 1.2) / 65536.0));
        pins.analogWritePin(AnalogPin.P1, 1023);
        basic.pause(3000);
    }
    //%block="getVOC"
    export function getVOC() {

    }
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
    }

    export function lcd() {
        tca9534aInit(60);
        tca9534aWritePort(((1 << 0) | (1 << 7) | (1 << 2) | (1 << 4) | (1 << 5) | (1 << 6)))

    }

    /**
     * Helper functions
     */

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
                    lightIntensity = lux;
                    basic.pause(3000);

                }
            }
        })
    }

    function startTempMeasurement()
    {
        tempInitialized = true;
        let temp;
        let tmp112;
        control.inBackground(function () {
            let buf: Buffer;
            while(true)
            {
                buf = pins.createBufferFromArray([0x01, 0x80]);
                pins.i2cWriteBuffer(tempAddress, buf);

                buf.fill(0);
                pins.i2cWriteBuffer(tempAddress, buf);

                temp = pins.i2cReadBuffer(tempAddress, 2);
                tmp112 = temp[0] + (temp[1] / 100)

                serial.writeLine("TEMP");
                serial.writeNumber(tmp112);
                temperature = tmp112;
                basic.pause(2000);
            }
        })
    }

    function startHumidityMeasurement() {
        humidityInititialized = true;
        control.inBackground(function () {
            let buf: Buffer;
            while(true)
            {
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
                humidity = hum_sht_per;
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

