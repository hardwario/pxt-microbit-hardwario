/**
* Jakub Smejkal, Karel Blavka @ HARDWARIO s.r.o.
* March 2020
* https://github.com/bigclownprojects/pxt-HARDWARIO
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

enum MeasurementDelays {
    Light,
    Temperature,
    Humidity,
    Barometer,
    Voc,
    Co2,
    Battery,
    All
}


const LIGHT_MEASUREMENT_DELAY = 3000;
const TEMPERATURE_MEASUREMENT_DELAY = 3000;
const HUMIDITY_MEASUREMENT_DELAY = 3000;
const BAROMETER_MEASUREMENT_DELAY = 3000;
const VOC_MEASUREMENT_DELAY = 3000;
const CO2_MEASUREMENT_DELAY = 3000;
const BATTERY_MEASUREMENT_DELAY = 3000;


const I2C_ADDRESS_TAG_LUX = 0x44;
const I2C_ADDRESS_TAG_TEMPERATURE = 0x48;
const I2C_ADDRESS_TAG_HUMIDITY = 0x40;
const I2C_ADDRESS_TAG_BAROMETER = 0x60;
const I2C_ADDRESS_TAG_VOC = 0x58;
const I2C_ADDRESS_MODULE_RELAY_TCA9534 = 0x3b;
const I2C_ADDRESS_MODULE_CO2_EXP = 0x38;
const I2C_ADDRESS_MODULE_CO2_FIFO = 0x4d;
const I2C_ADDRESS_MODULE_LCD_TCA9534 = 0x3c

/*** _____ ___   _____ ***/
/***|_   _|__ \ / ____|***/
/***  | |    ) | |     ***/
/***  | |   / /| |     ***/
/*** _| |_ / /_| |____ ***/
/***|_____|____|\_____|***/
namespace i2c {
    /**Read number from an i2c device with @address after sending the @buffer*/
    export function readNumber(address: number, buffer: number[]): number {
        let buf = pins.createBufferFromArray(buffer);
        pins.i2cWriteBuffer(address, buf, true);
        return pins.i2cReadNumber(address, NumberFormat.Int8BE);
    }

    /**Read buffer from an i2c device with @address after sending the @buffer*/
    export function readBuffer(address: number, buffer: number[], size: number): Buffer {
        let buf = pins.createBufferFromArray(buffer);
        pins.i2cWriteBuffer(address, buf, true);
        return pins.i2cReadBuffer(address, size);
    }

    /**Just a wrapper to make writing a buffer a little bit easier for me*/
    export function writeBuffer(address: number, buffer: number[]): number {
        let buf = pins.createBufferFromArray(buffer);
        return pins.i2cWriteBuffer(address, buf);
    }

    /**Writes data onto the @regAddress of device with @address*/
    export function memoryWrite(address: number, regAddress: number, data: number) {
        let buf: Buffer = pins.createBufferFromArray([regAddress, data]);
        pins.i2cWriteBuffer(address, buf);
    }
}

/*** _______ ____   ____  _       _____ ***/
/***|__   __/ __ \ / __ \| |     / ____|***/
/***   | | | |  | | |  | | |    | (___  ***/
/***   | | | |  | | |  | | |     \___ \ ***/
/***   | | | |__| | |__| | |____ ____) |***/
/***   |_|  \____/ \____/|______|_____/ ***/
namespace helperFunctions {

    let tca9534aInitialized: boolean = false;

    export function tca9534aInit(i2cAddress: number) {
        if (!tca9534aInitialized) {
            let returnVal: number;

            returnVal = i2c.readNumber(i2cAddress, [0x03]);

            returnVal = i2c.readNumber(i2cAddress, [0x01]);

            tca9534aInitialized = true;
        }
    }

    export function tca9534aWritePort(address: number, value: NumberFormat.UInt8BE) {
        let returnVal: number;
        returnVal = i2c.readNumber(address, [0x01, value]);
    }

    export function tca9534aSetPortDirection(address: number, direction: NumberFormat.UInt8BE) {
        let returnVal: number;
        returnVal = i2c.readNumber(address, [0x03, direction]);
    }



    export function sc16is740ResetFifo(fifo: number) {
        let register_fcr: number;
        register_fcr = fifo | 0x01;
        i2c.memoryWrite(I2C_ADDRESS_MODULE_CO2_EXP, 0x10, register_fcr);
    }


    export function sc16is740Init(address: number) {
        i2c.memoryWrite(address, 0x18, 0x80);
        i2c.memoryWrite(address, 0x00, 0x58);
        i2c.memoryWrite(address, 0x08, 0x00);
        i2c.memoryWrite(address, 0x18, 0xbf);
        i2c.memoryWrite(address, 0x10, 0x10);
        i2c.memoryWrite(address, 0x18, 0x07);
        i2c.memoryWrite(address, 0x10, 0x07);
        i2c.memoryWrite(address, 0x08, 0x11);
    }
}

/*** _____ _   _ ______ _____            _____ _____  _____ _____  ***/
/***|_   _| \ | |  ____|  __ \     /\   / ____|  __ \|_   _|  __ \ ***/
/***  | | |  \| | |__  | |__) |   /  \ | |  __| |__) | | | | |  | |***/
/***  | | | . ` |  __| |  _  /   / /\ \| | |_ |  _  /  | | | |  | |***/
/***  | |_| |\  | |    | | \ \  / ____ \ |__| | | \ \ _| |_| |__| |***/
/***|_____|_| \_|_|    |_|  \_\/_/    \_\_____|_|  \_\_____|_____/ ***/
namespace infragridModule {

}

/*** _      _____ _____  ***/
/***| |    / ____|  __ \ ***/
/***| |   | |    | |  | |***/
/***| |   | |    | |  | |***/
/***| |___| |____| |__| |***/
/***|______\_____|_____/ ***/
namespace lcdModule {

    export function init() {

        let vcom: number = 0;
        let framebuffer: number[] = [];

        helperFunctions.tca9534aInit(I2C_ADDRESS_MODULE_LCD_TCA9534);
        helperFunctions.tca9534aWritePort(I2C_ADDRESS_MODULE_LCD_TCA9534, ((1 << 0) | (1 << 7) | (1 << 2) | (1 << 4) | (1 << 5) | (1 << 6)));
        helperFunctions.tca9534aSetPortDirection(I2C_ADDRESS_MODULE_LCD_TCA9534, (1 << 1) | (1 << 3));
        pins.spiFrequency(1000000);
        pins.spiFormat(8, 0);

        let line: number;
        let offs: number;
        for (line = 0x01, offs = 1; line <= 128; line++ , offs += 18) {
            // Fill the gate line addresses on the exact place in the buffer
            framebuffer[offs] = bcLs013b7dh03Reverse(line);
        }

        let port = 245;
        port &= ~(1 << 7);
        port |= 1 << 7;

        helperFunctions.tca9534aWritePort(I2C_ADDRESS_MODULE_LCD_TCA9534, port);

        let col: number;
        for (line = 0x01, offs = 2; line <= 128; line++ , offs += 18) {
            for (col = 0; col < 16; col++) {
                framebuffer[offs + col] = 0xff;
            }
        }

        port = 245;
        port &= ~(1 << 7);
        helperFunctions.tca9534aWritePort(I2C_ADDRESS_MODULE_LCD_TCA9534, port);

        framebuffer[0] = 0x80 | vcom;

        pins.spiWrite(0)


    }

    /*function  moduleLcdCsPinSet(state: boolean) : boolean
    {
        if (!_bc_module_lcd_tca9534a_init()) {
            return false;
        }

        if (!bc_tca9534a_write_pin(&_bc_module_lcd.tca9534a, _BC_MODULE_LCD_LED_DISP_CS_PIN, state)) {
            _bc_module_lcd.is_tca9534a_initialized = false;

            return false;
        }

        return true;
    }*/



    function bcLs013b7dh03Reverse(b: number): number {
        b = (b & 0xf0) >> 4 | (b & 0x0f) << 4;
        b = (b & 0xcc) >> 2 | (b & 0x33) << 2;
        b = (b & 0xaa) >> 1 | (b & 0x55) << 1;

        return b;
    }
}

/***| |    | |  | \ \ / / ***/
/***| |    | |  | |\ V /  ***/
/***| |    | |  | | > <   ***/
/***| |___ | |__| |/ . \  ***/
/***| ______\____//_/ \_\ ***/
namespace luxTag {

    let opt3001Initialized: boolean = false;
    let illuminanceVar = 0;

    export function getIlluminance(): number {
        if (!opt3001Initialized) {
            startLightMeasurement();
        }
        return Math.trunc(illuminanceVar);
    }

    function startLightMeasurement() {
        let buf: Buffer;

        control.inBackground(function () {
            if (!opt3001Initialized) {
                if (i2c.writeBuffer(I2C_ADDRESS_TAG_LUX, [0x01, 0xc8, 0x10]) != 0) {
                    return;
                }
                basic.pause(50);
                opt3001Initialized = true;
            }

            let lux_status: number;

            while (true) {
                i2c.writeBuffer(I2C_ADDRESS_TAG_LUX, [0x01, 0xca, 0x10]);
                basic.pause(1000);

                i2c.writeBuffer(I2C_ADDRESS_TAG_LUX, [0x01]);

                lux_status = pins.i2cReadNumber(I2C_ADDRESS_TAG_LUX, NumberFormat.UInt16BE);
                if ((lux_status & 0x0680) == 0x0080) {

                    i2c.writeBuffer(I2C_ADDRESS_TAG_LUX, [0x00]);

                    let raw: number = pins.i2cReadNumber(I2C_ADDRESS_TAG_LUX, NumberFormat.UInt16BE);
                    let exponent: number = raw >> 12;
                    let fractResult: number = raw & 0xfff;
                    let shiftedExponent: number = 1 << exponent;
                    let lux: number = 0.01 * shiftedExponent * fractResult;

                    illuminanceVar = lux;

                    basic.pause(LIGHT_MEASUREMENT_DELAY);

                }
            }
        })
    }
}

/***  _____  ______ _           __     __***/
/*** |  __ \|  ____| |        /\\ \   / /***/
/*** | |__) | |__  | |       /  \\ \_/ / ***/
/*** |  _  /|  __| | |      / /\ \\   /  ***/
/*** | | \ \| |____| |____ / ____ \| |   ***/
/*** |_|  \_\______|______/_/    \_\_|   ***/
namespace relayModule {

    let relayInit: boolean = false;

    export function setState(state: RelayState) {
        if (!relayInit) {
            helperFunctions.tca9534aInit(I2C_ADDRESS_MODULE_RELAY_TCA9534);

            helperFunctions.tca9534aWritePort(I2C_ADDRESS_MODULE_RELAY_TCA9534, ((0x40) | (0x10)));

            helperFunctions.tca9534aSetPortDirection(I2C_ADDRESS_MODULE_RELAY_TCA9534, 0x00);

            relayInit = true;
        }

        if (state == RelayState.On) {
            helperFunctions.tca9534aWritePort(I2C_ADDRESS_MODULE_RELAY_TCA9534, ((0x10) | (0x20)));
        }
        else {
            helperFunctions.tca9534aWritePort(I2C_ADDRESS_MODULE_RELAY_TCA9534, ((0x40) | (0x80)));
        }
        basic.pause(50);
        helperFunctions.tca9534aWritePort(I2C_ADDRESS_MODULE_RELAY_TCA9534, 0);
    }
}

/***  ____          _____   ____  __  __ ______ _______ ______ _____  ***/
/*** |  _ \   /\   |  __ \ / __ \|  \/  |  ____|__   __|  ____|  __ \ ***/
/*** | |_) | /  \  | |__) | |  | | \  / | |__     | |  | |__  | |__) |***/
/*** |  _ < / /\ \ |  _  /| |  | | |\/| |  __|    | |  |  __| |  _  / ***/
/*** | |_) / ____ \| | \ \| |__| | |  | | |____   | |  | |____| | \ \ ***/
/*** |____/_/    \_\_|  \_\\____/|_|  |_|______|  |_|  |______|_|  \_\***/
namespace barometerTag {

    let mpl3115a2Initialized: boolean = false;
    let pressureVar = 0;
    let altitudeVar = 0;

    export function getAltidude() {
        if (!mpl3115a2Initialized) {
            basic.pause(10);
            startBarometerMeasurement();
        }
        return Math.trunc(altitudeVar);
    }

    export function getPressure() {
        if (!mpl3115a2Initialized) {
            startBarometerMeasurement();
        }
        return Math.trunc(pressureVar);
    }

    function startBarometerMeasurement() {

        let buf: Buffer;

        control.inBackground(function () {

            if (!mpl3115a2Initialized) {
                if (i2c.writeBuffer(I2C_ADDRESS_TAG_BAROMETER, [0x26, 0x04]) != 0) {
                    return;
                }
                mpl3115a2Initialized = true;
                basic.pause(1500);
            }

            while (true) {
                //PRESSURE
                if (i2c.writeBuffer(I2C_ADDRESS_TAG_BAROMETER, [0x26, 0x38]) != 0) {
                    return;
                }

                i2c.writeBuffer(I2C_ADDRESS_TAG_BAROMETER, [0x13, 0x07]);

                i2c.writeBuffer(I2C_ADDRESS_TAG_BAROMETER, [0x26, 0x3a]);
                basic.pause(1500);

                i2c.writeBuffer(I2C_ADDRESS_TAG_BAROMETER, [0x00]);

                let pre_status = i2c.readNumber(I2C_ADDRESS_TAG_BAROMETER, [0x00])
                pins.i2cReadNumber(I2C_ADDRESS_TAG_BAROMETER, 1);

                if (pre_status == 0x0e) {

                    let resultBuf: Buffer = i2c.readBuffer(I2C_ADDRESS_TAG_BAROMETER, [0x01], 5);
                    let firstParam: NumberFormat.UInt32BE = resultBuf[1] << 16;
                    let secondParam: NumberFormat.UInt32BE = resultBuf[2] << 8;
                    let thirdParam: NumberFormat.UInt32BE = resultBuf[3];
                    thirdParam = thirdParam << 8;

                    let out_p: NumberFormat.Int32BE = firstParam | secondParam | thirdParam;
                    let pascal: NumberFormat.Float32BE = (out_p) / 64.0;

                    pressureVar = pascal;

                    basic.pause(20);

                    //ALTITUDE
                    i2c.writeBuffer(I2C_ADDRESS_TAG_BAROMETER, [0x26, 0xb8]);

                    i2c.writeBuffer(I2C_ADDRESS_TAG_BAROMETER, [0x13, 0x07]);

                    i2c.writeBuffer(I2C_ADDRESS_TAG_BAROMETER, [0x26, 0xba]);
                    basic.pause(1500);

                    i2c.writeBuffer(I2C_ADDRESS_TAG_BAROMETER, [0]);

                    let alt_status = pins.i2cReadNumber(I2C_ADDRESS_TAG_BAROMETER, 1);

                    if (alt_status == 0x0e) {
                        i2c.writeBuffer(I2C_ADDRESS_TAG_BAROMETER, [0x01]);

                        let resultBuf: Buffer = pins.i2cReadBuffer(I2C_ADDRESS_TAG_BAROMETER, 5);
                        let firstParam: NumberFormat.UInt32BE = resultBuf[1] << 24;
                        let secondParam: NumberFormat.UInt32BE = resultBuf[2] << 16;
                        let thirdParam: NumberFormat.UInt32BE = (resultBuf[3] & 0xf0);
                        thirdParam = thirdParam << 8;

                        let out_pa: NumberFormat.Int32BE = firstParam | secondParam | thirdParam;
                        let meter: NumberFormat.Float32BE = (out_pa) / 65536.0;
                        altitudeVar = meter;

                    }

                    basic.pause(BAROMETER_MEASUREMENT_DELAY);
                }
            }
        })
    }
}

/*** __      ______   _____ ***/
/*** \ \    / / __ \ / ____|***/
/***  \ \  / / |  | | |     ***/
/***   \ \/ /| |  | | |     ***/
/***    \  / | |__| | |____ ***/
/***     \/   \____/ \_____|***/
namespace vocTag {

    let sgp30Initialized: boolean = false;
    let tvocVar = 0;

    export function getTVOC(): number {
        if (!sgp30Initialized) {
            startVOCMeasurement();
        }
        return Math.trunc(tvocVar);
    }

    function startVOCMeasurement() {
        let buf: Buffer;
        let outBuf: Buffer;

        control.inBackground(function () {
            if (!sgp30Initialized) {
                outBuf = i2c.readBuffer(I2C_ADDRESS_TAG_VOC, [0x20, 0x2f], 3);

                if (i2c.writeBuffer(I2C_ADDRESS_TAG_VOC, [0x20, 0x03]) != 0) {
                    sgp30Initialized = false;
                    return;
                }
                sgp30Initialized = true;
            }

            while (true) {
                let crcBuf: number[] = [0x00, 0x00];

                let crc = sgp30CalculateCrc(crcBuf, 2);

                if (i2c.writeBuffer(I2C_ADDRESS_TAG_VOC, [0x20, 0x61, 0x00, 0x00, crc]) != 0) {
                    return;
                }
                basic.pause(30);

                i2c.writeBuffer(I2C_ADDRESS_TAG_VOC, [0x20, 0x08]);
                basic.pause(30);

                outBuf = pins.i2cReadBuffer(I2C_ADDRESS_TAG_VOC, 6);

                let co2eq = (outBuf[0] << 8) | outBuf[1];
                let tvoc = (outBuf[3] << 8) | outBuf[4];

                tvocVar = tvoc;

                basic.pause(VOC_MEASUREMENT_DELAY);
            }
        })
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
}

/*** __      ______   _____      _      _____  ***/
/*** \ \    / / __ \ / ____|    | |    |  __ \ ***/
/***  \ \  / / |  | | |   ______| |    | |__) |***/
/***   \ \/ /| |  | | |  |______| |    |  ___/ ***/
/***    \  / | |__| | |____     | |____| |     ***/
/***     \/   \____/ \_____|    |______|_|     ***/
namespace vocLpTag {

    let sgpc3Initialized: boolean = false;
    let tvocVar = 0;

    export function getTVOC(): number {
        if (!sgpc3Initialized) {
            startVOCLpMeasurement();
        }
        return Math.trunc(tvocVar);
    }

    function startVOCLpMeasurement() {
        let buf: Buffer;
        let outBuf: Buffer;

        control.inBackground(function () {
            if (!sgpc3Initialized) {
                outBuf = i2c.readBuffer(I2C_ADDRESS_TAG_VOC, [0x20, 0x2f], 3);

                if (i2c.writeBuffer(I2C_ADDRESS_TAG_VOC, [0x20, 0xae]) != 0) {
                    sgpc3Initialized = false;
                    return;
                }
                sgpc3Initialized = true;
            }

            while (true) {
                let crcBuf: number[] = [0x00, 0x00];
                let crc = sgpc3CalculateCrc(crcBuf, 2);

                if (i2c.writeBuffer(I2C_ADDRESS_TAG_VOC, [0x20, 0x61, 0x00, 0x00, crc]) != 0) {
                    return;
                }
                basic.pause(30);

                i2c.writeBuffer(I2C_ADDRESS_TAG_VOC, [0x20, 0x08]);
                basic.pause(150);

                outBuf = pins.i2cReadBuffer(I2C_ADDRESS_TAG_VOC, 6);

                let tvoc = (outBuf[0] << 8) | outBuf[1];

                tvocVar = tvoc;

                basic.pause(VOC_MEASUREMENT_DELAY);
            }
        })
    }

    function sgpc3CalculateCrc(buffer: number[], length: number): NumberFormat.UInt8LE {
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
}

/***  _    _ _    _ __  __ _____ _____ _____ _________     __***/
/*** | |  | | |  | |  \/  |_   _|  __ \_   _|__   __\ \   / /***/
/*** | |__| | |  | | \  / | | | | |  | || |    | |   \ \_/ / ***/
/*** |  __  | |  | | |\/| | | | | |  | || |    | |    \   /  ***/
/*** | |  | | |__| | |  | |_| |_| |__| || |_   | |     | |   ***/
/*** |_|  |_|\____/|_|  |_|_____|_____/_____|  |_|     |_|   ***/
namespace humidityTag {

    let humidityInititialized: boolean = false;
    let humidityVar = 0;

    export function getHumidity(): number {
        if (!humidityInititialized) {
            startHumidityMeasurement();
        }
        return Math.trunc(humidityVar);
    }

    function startHumidityMeasurement() {
        humidityInititialized = true;

        control.inBackground(function () {
            let buf: Buffer;
            while (true) {
                if (i2c.writeBuffer(I2C_ADDRESS_TAG_HUMIDITY, [0xfe]) != 0) {
                    humidityInititialized = false;
                    return;
                }
                basic.pause(20);

                i2c.writeBuffer(I2C_ADDRESS_TAG_HUMIDITY, [0xf5]);
                basic.pause(50);

                let rh = pins.i2cReadBuffer(I2C_ADDRESS_TAG_HUMIDITY, 2);

                let raw = rh[0] << 8 | rh[1];
                let percentage = -6 + 125 * raw / 65536

                humidityVar = percentage;

                basic.pause(HUMIDITY_MEASUREMENT_DELAY);
            }
        })

    }
}

/***  _______ ______ __  __ _____  ______ _____         _______ _    _ _____  ______ ***/
/*** |__   __|  ____|  \/  |  __ \|  ____|  __ \     /\|__   __| |  | |  __ \|  ____|***/
/***    | |  | |__  | \  / | |__) | |__  | |__) |   /  \  | |  | |  | | |__) | |__   ***/
/***    | |  |  __| | |\/| |  ___/|  __| |  _  /   / /\ \ | |  | |  | |  _  /|  __|  ***/
/***    | |  | |____| |  | | |    | |____| | \ \  / ____ \| |  | |__| | | \ \| |____ ***/
/***    |_|  |______|_|  |_|_|    |______|_|  \_\/_/    \_\_|   \____/|_|  \_\______|***/
namespace temperatureTag {

    let temperatureInitialized: boolean = false;
    let temperatureVar = 0;

    export function getTepmerature(): number {
        if (!temperatureInitialized) {
            startTemperatureMeasurement();
        }
        return Math.trunc(temperatureVar);
    }

    function startTemperatureMeasurement() {

        temperatureInitialized = true;

        let t;
        let tmp112;

        control.inBackground(function () {
            let buf: Buffer;

            while (true) {
                if (i2c.writeBuffer(I2C_ADDRESS_TAG_TEMPERATURE, [0x01, 0x80]) != 0) {
                    temperatureInitialized = false;
                    return;
                }

                i2c.writeBuffer(I2C_ADDRESS_TAG_TEMPERATURE, [0x00]);

                t = pins.i2cReadBuffer(I2C_ADDRESS_TAG_TEMPERATURE, 2);
                tmp112 = t[0] + (t[1] / 100)

                t = tmp112;
                temperatureVar = t;
                serial.writeLine("TEMP");
                serial.writeNumber(t);
                basic.pause(TEMPERATURE_MEASUREMENT_DELAY);
            }
        })
    }
}

/***  ____       _______ _______ ______ _______     __***/
/*** |  _ \   /\|__   __|__   __|  ____|  __ \ \   / /***/
/*** | |_) | /  \  | |     | |  | |__  | |__) \ \_/ / ***/
/*** |  _ < / /\ \ | |     | |  |  __| |  _  / \   /  ***/
/*** | |_) / ____ \| |     | |  | |____| | \ \  | |   ***/
/*** |____/_/    \_\_|     |_|  |______|_|  \_\ |_|   ***/
namespace batteryModule {

    let voltageMeasurementStarted: boolean = false;
    let voltage = 0;

    export function getVoltage(type: BatteryModuleType): number {

        if (!voltageMeasurementStarted) {
            startVoltageMeasurement(type);
            voltageMeasurementStarted = true;
        }
        return voltage;
    }

    function startVoltageMeasurement(type: BatteryModuleType) {

        control.inBackground(function () {

            while (true) {
                if (type == BatteryModuleType.Mini) {
                    pins.digitalWritePin(DigitalPin.P1, 0);
                    basic.pause(100);

                    let result: number = pins.analogReadPin(AnalogPin.P0);

                    pins.analogWritePin(AnalogPin.P1, 1023);
                    voltage = (3 / 1024 * result / 0.33) + 0.1;
                }
                else {
                    pins.digitalWritePin(DigitalPin.P1, 1);
                    basic.pause(100);

                    let result: number = pins.analogReadPin(AnalogPin.P0);

                    pins.digitalWritePin(DigitalPin.P1, 0);
                    voltage = 3 / 1024 * result / 0.13;
                }

                basic.pause(BATTERY_MEASUREMENT_DELAY);
            }
        })
    }
}

/***  _____ ____ ___  ***/
/*** / ____/ __ \__ \ ***/
/***| |   | |  | | ) |***/
/***| |   | |  | |/ / ***/
/***| |___| |__| / /_ ***/
/*** \_____\____/____|***/
namespace co2Module {
    let co2Initialized: boolean = false;
    let co2ConcentrationVar = 0;

    export function getCO2(): number {
        if (!co2Initialized) {
            startCO2Measurement();
        }
        return co2ConcentrationVar;
    }

    function startCO2Measurement() {
        co2Initialized = true;

        let co2Pressure = 10124;
        let sensorState: Buffer = pins.createBuffer(23);
        let firstMeasurementDone = false;
        let length: number = 8;
        let buf: Buffer;
        /**INIT */
        control.inBackground(function () {

            helperFunctions.tca9534aInit(0x38);
            helperFunctions.tca9534aWritePort(0x38, 0x00);
            helperFunctions.tca9534aSetPortDirection(0x38, (~(0x01) & ~(0x10)) & (~(0x40)));

            basic.pause(1);

            helperFunctions.tca9534aSetPortDirection(0x38, (~(0x01) & ~(0x10)));


            basic.pause(1);

            helperFunctions.sc16is740Init(I2C_ADDRESS_MODULE_CO2_FIFO);

            /**CHARGE */
            moduleCo2ChargeEnable(true);
            basic.pause(60000);
            moduleCo2ChargeEnable(false);

            while (true) {
                moduleCo2DeviceEnable(true);

                basic.pause(140);
                let value = 50;
                /**BOOT */

                while (value != 0) {
                    let port = i2c.readNumber(0x38, [0x00]);
                    value = ((port >> 7) & 0x01);

                    basic.pause(10);
                }


                if (!firstMeasurementDone) {
                    buf = pins.createBufferFromArray([0x00, 0xfe, 0x41, 0x00, 0x80, 0x01, 0x10, 0x28, 0x7e]);
                    length = 8;
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

                    length = 33;

                }
                moduleCo2UartEnable(true);
                pins.i2cWriteBuffer(I2C_ADDRESS_MODULE_CO2_FIFO, buf);
                basic.pause(120);

                /**BOOT READ */

                let spacesAvaliable = i2c.readNumber(I2C_ADDRESS_MODULE_CO2_FIFO, [0x48]);
                pins.i2cWriteNumber(I2C_ADDRESS_MODULE_CO2_FIFO, 0x00, NumberFormat.Int8LE);
                let readBuf: Buffer = pins.i2cReadBuffer(I2C_ADDRESS_MODULE_CO2_FIFO, 4);

                if (readBuf[0] != 0xfe) {
                    return -1;
                }
                if (readBuf[1] != 0x41) {
                    return -1;
                }
                if (lp8CalculateCrc16(readBuf, 4) != 0) {
                    return -1;
                }
                basic.pause(70);

                /**MEASURE */
                value = 50;
                while (value == 0) {
                    let port = i2c.readNumber(0x38, [0x00]);
                    value = ((port >> 7) & 0x01);

                    basic.pause(10);
                }


                moduleCo2UartEnable(true);
                i2c.writeBuffer(I2C_ADDRESS_MODULE_CO2_FIFO, [0x00, 0xfe, 0x44, 0x00, 0x80, 0x2c, 0x79, 0x39]);
                basic.pause(120);

                /**MEASURE READ */

                spacesAvaliable = i2c.readNumber(I2C_ADDRESS_MODULE_CO2_FIFO, [0x48]);
                pins.i2cWriteNumber(I2C_ADDRESS_MODULE_CO2_FIFO, 0x00, NumberFormat.Int8LE);
                readBuf = pins.i2cReadBuffer(I2C_ADDRESS_MODULE_CO2_FIFO, 49);
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

                co2ConcentrationVar = concentration;

                basic.pause(CO2_MEASUREMENT_DELAY);
            }
        })
    }

    function moduleCo2DeviceEnable(state: boolean) {
        let direction: number = (~(0x01) & ~(0x10));

        if (state) {
            direction &= (~(0x04)) & (~(0x02)) & (~(0x08));
        }
        helperFunctions.tca9534aSetPortDirection(I2C_ADDRESS_MODULE_CO2_EXP, direction);
    }

    function moduleCo2ChargeEnable(state: boolean) {
        let direction: number = (~(0x00) & ~(0x10));

        if (state) {
            direction &= (~(0x04)) & (~(0x02));
        }
        return helperFunctions.tca9534aSetPortDirection(I2C_ADDRESS_MODULE_CO2_EXP, direction);
    }

    function moduleCo2UartEnable(state: boolean) {
        if (state) {
            helperFunctions.sc16is740ResetFifo(2);
        }
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
}

//% color=#e30427 icon="\uf2db" block="HARDWARIO"
namespace hardwario {
    let motionInit: boolean = false;

    /**
    * Reads the current value of light intensity from the sensor.
	    * Returns illuminance in lux.
    */
    //%block="illuminance"
    export function illuminance(): number {
        return luxTag.getIlluminance();
    }

    /**
    * Sets the delay between measurements on chosen sensor to value in ms.
    */
    //%block="change $sensorType measurement delay to $delay"
    export function measurementDelay(sensorType: MeasurementDelays, delay: number) {
        switch (sensorType) {
            case MeasurementDelays.Light:
                break;
            case MeasurementDelays.Barometer:
                break;
            case MeasurementDelays.Battery:
                break;
            case MeasurementDelays.Co2:
                break;
            case MeasurementDelays.Humidity:
                break;
            case MeasurementDelays.Temperature:
                break;
            case MeasurementDelays.Voc:
                break;
            case MeasurementDelays.All:
                break;
        }
    }

    /**
    * Reads the current value of CO2 in air from the sensor on CO2 Module.
	    * Returns concentration of CO2 in air.
    */
    //%block="co2"
    export function co2(): number {
        return co2Module.getCO2();
    }

    /**
    * Reads the current value of temperature from the sensor.
	    * Returns temperature in celsius. 
    */
    //%block="temperature"
    export function temperature(): number {
        return temperatureTag.getTepmerature();
    }

    /**
    * Reads the current value of humidity from the sensor.
	    * Returns relative humidity in percent. 
    */
    //%block="humidity"
    export function humidity(): number {
        return humidityTag.getHumidity();
    }

    /**
    * Reads the current concentration of voc(volatile organic compound) in the air from the sensor.
        * Returns total voc(tvoc) in the air in ppm.
    */
    //%block="voc"
    export function voc(): number {
        return vocTag.getTVOC();
    }

    /**
    * Reads the current concentration of voc(volatile organic compound) in the air from the low-power sensor.
        * Returns total voc(tvoc) in the air in ppm.
    */
    //%block="voc | lp"
    export function vocLP(): number {
        return vocLpTag.getTVOC();
    }

    /**
    * Reads the current altitude from the barometer sensor.
	    * Returns meters above sea level.
    */
    //%block="altitude"
    export function altitude(): number {
        return barometerTag.getAltidude();
    }

    /**
    * Reads the current atmospheric pressure from the barometer sensor.
	    * Returns atmospheric pressure in pascals.
    */
    //%block="pressure"
    export function pressure(): number {
        return barometerTag.getPressure();
    }

    /**
    * Get battery voltage of the batteries in Battery Module. You have to choose if you have
    * Battery Module (4 cells) or Mini Battery Module (2 cells).
    */
    //%block="voltage on $type | battery module"
    export function batteryVoltage(type: BatteryModuleType): number {
        return batteryModule.getVoltage(type);
    }

    /**
    * Sets the state of bi-stable relay on the Relay Module to on/off.
    */
    //%block="set relay state $state"
    export function setRelay(state: RelayState) {
        relayModule.setState(state);
    }

    /**
    * Sets the state of bi-stable relay on the Relay Module to on/off.
    */
    //%block="lcd"
    export function lcdStart() {
        lcdModule.init();
    }

    /**
    //%block="motion $pin"
    export function motionDetectorTask(pin: DigitalPin) {
        basic.forever(function () {
            while (true) {

                if (!motionInit) {

                    serial.writeLine("INIT");
                    pins.setPull(pin, PinPullMode.PullUp);
                    motionInit = true;
                }

                let motion: number = pins.digitalReadPin(pin);
                serial.writeLine("Pohyb: " + motion);

                if (motion) {

                    serial.writeLine("motion detected");

                    pins.digitalWritePin(pin, 0);
                    basic.pause(50);
                }
                basic.pause(1000);
            }
        })
    }*/
}
