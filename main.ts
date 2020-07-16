/**
* Martin Hubáček, Pavel Hübner, Karel Blavka, Jakub Smejkal @ HARDWARIO s.r.o.
* March 2020
* https://github.com/hardwario/pxt-microbit-hardwario
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

enum Events {
    Movement = 150,
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


let LIGHT_MEASUREMENT_DELAY: number = 3000;
let TEMPERATURE_MEASUREMENT_DELAY: number = 3000;
let HUMIDITY_MEASUREMENT_DELAY: number = 3000;
let BAROMETER_MEASUREMENT_DELAY: number = 3000;
let VOC_MEASUREMENT_DELAY: number = 3000;
let CO2_MEASUREMENT_DELAY: number = 3000;
let BATTERY_MEASUREMENT_DELAY: number = 3000;


const I2C_ADDRESS_TAG_LUX = 0x44;
const I2C_ADDRESS_TAG_TEMPERATURE = 0x48;
const I2C_ADDRESS_TAG_HUMIDITY = 0x40;
const I2C_ADDRESS_TAG_BAROMETER = 0x60;
const I2C_ADDRESS_TAG_VOC = 0x58;
const I2C_ADDRESS_MODULE_INFRAGRID_TCA9534 = 0x23;
const I2C_ADDRESS_MODULE_INFRAGRID = 0x68;
const I2C_ADDRESS_MODULE_RELAY_TCA9534 = 0x3b;
const I2C_ADDRESS_MODULE_CO2_EXP = 0x38;
const I2C_ADDRESS_MODULE_CO2_FIFO = 0x4d;
const I2C_ADDRESS_MODULE_LCD_TCA9534 = 0x3c;

let lcdPinSetUp: number = 0;
let infragridPinSetUp: number = 0;
let infragridDirection: number = 0;

let measurementTaskStarted: boolean = false;

class Sensor {
    public initialized: boolean;
    public i2cAddress: number;
    protected value: number;
    protected lastMeasurement: number;
    protected measurementDelay: number;

    constructor(i2cAddress: number, measurementDelay: number) {
        this.i2cAddress = i2cAddress;
        this.initialized = false;
        this.measurementDelay = measurementDelay;
    }

    public getValue(): number {
        return Math.trunc(this.value);
    }
}

/*** _____ ___   _____ ***/
/***|_   _|__ \ / ____|***/
/***  | |    ) | |     ***/
/***  | |   / /| |     ***/
/*** _| |_ / /_| |____ ***/
/***|_____|____|\_____|***/
namespace i2c {
    //Read number from an i2c device with @address after sending the @buffer
    export function readNumber(address: number, buffer: number[]): number {
        let buf = pins.createBufferFromArray(buffer);
        pins.i2cWriteBuffer(address, buf, true);
        return pins.i2cReadNumber(address, NumberFormat.Int8BE);
    }

    //Read buffer from an i2c device with @address after sending the @buffer
    export function readBuffer(address: number, buffer: number[], size: number): Buffer {
        let buf = pins.createBufferFromArray(buffer);
        pins.i2cWriteBuffer(address, buf, true);
        return pins.i2cReadBuffer(address, size);
    }

    //Just a wrapper to make writing a buffer a little bit easier for me
    export function writeBuffer(address: number, buffer: number[]): number {
        let buf = pins.createBufferFromArray(buffer);
        return pins.i2cWriteBuffer(address, buf);
    }

    //Writes data onto the @regAddress of device with @address
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

    export function calculateCrc(buffer: number[], length: number): NumberFormat.UInt8LE {
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

    
    export function checkTimeFromLastMeasurement(Sensor: any): boolean {
        if ((input.runningTime() - Sensor.lastMeasurement) < Sensor.measurementDelay) {
            return false;
        }
        else {
            return true;
        }
    }

    export function tca9534aInit(i2cAddress: number) {
        if (!tca9534aInitialized) {
            let returnVal: number;

            returnVal = i2c.readNumber(i2cAddress, [0x03]);

            returnVal = i2c.readNumber(i2cAddress, [0x01]);

            tca9534aInitialized = true;
        }
    }

    export function tca9534aWritePin(address: number, pin: NumberFormat.UInt8BE, value: number) {
        let port: number = infragridPinSetUp;

        port &= ~(1 << pin);

        if (value != 0)
        {
            port |= 1 << pin;
        }

        tca9534aWritePort(address, port);
    }

    export function tca9534aWritePort(address: number, value: NumberFormat.UInt8BE) {
        let returnVal: number;
        infragridPinSetUp = value;

        returnVal = i2c.readNumber(address, [0x01, value]);
    }

    export function tca9534aSetPinDirection(address: number, pin: NumberFormat.UInt8BE, direction: NumberFormat.UInt8BE) {
        
        let portDirection: number = direction
        portDirection &= ~(1 << pin); 

        if (direction == 1)
        {
            portDirection |= 1 << pin;
        }

        tca9534aSetPortDirection(address, portDirection);
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
    let buf: Buffer;

    export function getTemperatureCelsius() {
        let temperature: NumberFormat.Float32BE;
        let temporary_data: NumberFormat.Int16BE;
        for (let i = 0; i < 64; i++) {
            temporary_data = buf.getNumber(NumberFormat.Int16BE, i);
            if (temporary_data > 0x200)
            {
                temperature = (-temporary_data + 0xfff) * -0.25;
            }
            else
            {
                temperature = temporary_data * 0.25;
            }
            serial.writeString(temperature + " ");
            if (i % 8 == 0) {
                serial.writeLine("");
            }
        }
        for(let i = 0; i < 8; i++) {
            for(let j = 0; j < 8; j++) {
                temporary_data = buf.getNumber(NumberFormat.Int16BE, (i * 8) + j);
                if (temporary_data > 0x200)
                {
                    temperature = (-temporary_data + 0xfff) * -0.25;
                }
                else
                {
                    temperature = temporary_data * 0.25;
                }
                //led.plotBrightness(i, j, Math.map(temperature, 10, 60, 0, 255));
            }
        }

    }

    //TODO: SLEEP MODE
    export function init() {

        helperFunctions.tca9534aInit(I2C_ADDRESS_MODULE_INFRAGRID_TCA9534);
        helperFunctions.tca9534aSetPinDirection(I2C_ADDRESS_MODULE_INFRAGRID_TCA9534, 7, 0);
        helperFunctions.tca9534aWritePin(I2C_ADDRESS_MODULE_INFRAGRID_TCA9534, 7, 1);

        i2c.memoryWrite(I2C_ADDRESS_MODULE_INFRAGRID, 0x02, 0x00);

        i2c.memoryWrite(I2C_ADDRESS_MODULE_INFRAGRID, 0x03, 0x00);

        i2c.memoryWrite(I2C_ADDRESS_MODULE_INFRAGRID, 0x1f, 0x50);
        i2c.memoryWrite(I2C_ADDRESS_MODULE_INFRAGRID, 0x1f, 0x45);
        i2c.memoryWrite(I2C_ADDRESS_MODULE_INFRAGRID, 0x1f, 0x57);
        i2c.memoryWrite(I2C_ADDRESS_MODULE_INFRAGRID, 0x07, 0x20);
        i2c.memoryWrite(I2C_ADDRESS_MODULE_INFRAGRID, 0x1f, 0x00);

        basic.pause(200);

        control.inBackground(function () {
            while (true) {
                serial.writeLine("START");
                /*helperFunctions.tca9534aWritePin(I2C_ADDRESS_MODULE_INFRAGRID_TCA9534, 7, 1);
                basic.pause(50);

                i2c.memoryWrite(I2C_ADDRESS_MODULE_INFRAGRID, 0x00, 0x00);
                basic.pause(50);

                i2c.memoryWrite(I2C_ADDRESS_MODULE_INFRAGRID, 0x01, 0x3f);
                basic.pause(10);

                i2c.memoryWrite(I2C_ADDRESS_MODULE_INFRAGRID, 0x01, 0x30);
                basic.pause(110);

                i2c.memoryWrite(I2C_ADDRESS_MODULE_INFRAGRID, 0x02, 0x01);

                i2c.memoryWrite(I2C_ADDRESS_MODULE_INFRAGRID, 0x03, 0x00);

                i2c.memoryWrite(I2C_ADDRESS_MODULE_INFRAGRID, 0x1f, 0x50);
                i2c.memoryWrite(I2C_ADDRESS_MODULE_INFRAGRID, 0x1f, 0x45);
                i2c.memoryWrite(I2C_ADDRESS_MODULE_INFRAGRID, 0x1f, 0x57);
                i2c.memoryWrite(I2C_ADDRESS_MODULE_INFRAGRID, 0x07, 0x20);
                i2c.memoryWrite(I2C_ADDRESS_MODULE_INFRAGRID, 0x1f, 0x00);
                basic.pause(5);*/

                buf = i2c.readBuffer(I2C_ADDRESS_MODULE_INFRAGRID, [0x80], 64 * 2);

                getTemperatureCelsius();
                basic.pause(50);
            }
        })
    }
}

/*** _      _____ _____  ***/
/***| |    / ____|  __ \ ***/
/***| |   | |    | |  | |***/
/***| |   | |    | |  | |***/
/***| |___| |____| |__| |***/
/***|______\_____|_____/ ***/
//NOT COMPLETE//
namespace lcdModule {

    export function init() {
        let framebuffer: number [] = [];

        for(let i = 0; i < 20; i++) {
            framebuffer[i] = 0;
        }

        serial.writeLine("INITIALIZE");
        let vcom: number = 0;

        helperFunctions.tca9534aInit(I2C_ADDRESS_MODULE_LCD_TCA9534);
        helperFunctions.tca9534aWritePort(I2C_ADDRESS_MODULE_LCD_TCA9534, ((1 << 0) | (1 << 7) | (1 << 2) | (1 << 4) | (1 << 5) | (1 << 6)));
        helperFunctions.tca9534aSetPortDirection(I2C_ADDRESS_MODULE_LCD_TCA9534, (1 << 1) | (1 << 3));
        pins.spiFrequency(1000000);
        pins.spiFormat(8, 0);

        let line: number;
        let offs: number;
        for (line = 1, offs = 1; line <= 2; line++ , offs += 18) {
            serial.writeLine("CYCLE LCD");
            framebuffer[offs] = bcLs013b7dh03Reverse(line);
        }
        serial.writeNumbers(framebuffer);

        //CS pin set
        helperFunctions.tca9534aWritePin(I2C_ADDRESS_MODULE_LCD_TCA9534, 7, 1);
        //lcdClear();

        /*CLEAR*/
        helperFunctions.tca9534aWritePin(I2C_ADDRESS_MODULE_LCD_TCA9534, 7, 0);
        pins.spiTransfer(Buffer.fromArray([0x20, 0x00]), null);
        helperFunctions.tca9534aWritePin(I2C_ADDRESS_MODULE_LCD_TCA9534, 7, 1);
        serial.writeLine("CLEAR");

        for(let i = 0; i < 20; i++) {
            lcdDrawPixel(i, 1, 0);
        }

        framebuffer[0] = 0x80 | 0x40;

        serial.writeNumbers(framebuffer);

        helperFunctions.tca9534aWritePin(I2C_ADDRESS_MODULE_LCD_TCA9534, 7, 0);

        pins.spiTransfer(Buffer.fromArray(framebuffer), null);

        helperFunctions.tca9534aWritePin(I2C_ADDRESS_MODULE_LCD_TCA9534, 7, 1);
        

        /*for(;;) {
            helperFunctions.tca9534aWritePort(I2C_ADDRESS_MODULE_LCD_TCA9534, ((1 << 4) | (1 << 5) | (1 << 6)));
            basic.pause(100);
            helperFunctions.tca9534aWritePort(I2C_ADDRESS_MODULE_LCD_TCA9534, 0);
            basic.pause(1000);
        }*/
    }

    function lcdClear() {
        let line: number;
        let offs: number;
        let col: number;

        for (line = 1, offs = 2; line <= 2; line++ , offs += 18) {
            for(col = 0; col < 16; col++) {
                //framebuffer[offs + col] = 0xff;
            }
        }
    }

    function lcdDrawPixel(x: number, y: number, color: number) {
        // Skip mode byte + addr byte
        let byteIndex: NumberFormat.Int32BE = 2;
        // Skip lines
        byteIndex += y * 18;
        // Select column byte
        byteIndex += x / 8;

        let bitMask: number = 1 << (7 - (x % 8));

        if (color == 0)
        {
            //framebuffer[byteIndex] |= bitMask;
        }
        else
        {
            //framebuffer[byteIndex] &= ~bitMask;
        }
    }

    /*function moduleLcdCsPinSet(state: boolean): boolean
    {
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

/***_____ _____ _____    ***/
/***|  __ \_   _|  __ \  ***/
/***| |__) || | | |__) | ***/
/***|  ___/ | | |  _  /  ***/
/***| |    _| |_| | \ \  ***/
/***|_|   |_____|_|  \_\ ***/                   
namespace pirModule {

    export function startMotionSensor(dlPin : DigitalPin, serinPin : DigitalPin,
                               sensitivity : number, blindTime : number, 
                               pulseCounter : number, windowTime : number) {
        //Pins initialization
        pins.setPull(dlPin, PinPullMode.PullNone);
        pins.digitalReadPin(dlPin);
    
        pins.digitalWritePin(serinPin, 0);
        control.waitMicros(1000);

        //Sensor configuration
        writeField(sensitivity, 8, serinPin);
        writeField(blindTime, 4, serinPin);
        writeField(pulseCounter, 2, serinPin);
        writeField(windowTime, 2, serinPin);
        writeField(2, 2, serinPin);
        writeField(0, 2, serinPin);
        writeField(16, 5, serinPin);

        pins.digitalWritePin(serinPin, 0);
        control.waitMicros(1000);
    }

    function writeBit(value : number, serinPin : DigitalPin) {
        if (value == 0)
        {
            pins.digitalWritePin(serinPin, 1);
            control.waitMicros(5);
            pins.digitalWritePin(serinPin, 0);
            control.waitMicros(95);
        }
        else if (value == 1)
        {
            pins.digitalWritePin(serinPin, 1);
            control.waitMicros(95);
            pins.digitalWritePin(serinPin, 0);
            control.waitMicros(5);
        }
    }

    function writeField(value : number, len : number, serinPin : DigitalPin) {
        let bit : number;
        for (let i = 0; i < len; i++)
        {
            if ((value & (2 ** (len - i - 1))) == 0)
            {
                bit = 0;
            }
            else
            {
                bit = 1;
            }
            writeBit(bit, serinPin);
        }
    }
}

/***| |    | |  | \ \ / / ***/
/***| |    | |  | |\ V /  ***/
/***| |    | |  | | > <   ***/
/***| |___ | |__| |/ . \  ***/
/***| ______\____//_/ \_\ ***/
class LuxTag extends Sensor {
    
    public constructor(i2cAddress: number, measurementDelay: number) { 
        super(i2cAddress, measurementDelay);
        this.init();
    }

    private init() {
        if (!this.initialized) {
            if (i2c.writeBuffer(this.i2cAddress, [0x01, 0xc8, 0x10]) != 0) {
                return;
            }
            this.initialized = true;
            basic.pause(50);
        }
    }

    public measureIlluminance() {
        if (!this.initialized) {
            this.init();
        }

        let lux_status: number;

        i2c.writeBuffer(this.i2cAddress, [0x01, 0xca, 0x10]);
        basic.pause(1000);

        i2c.writeBuffer(this.i2cAddress, [0x01]);

        lux_status = pins.i2cReadNumber(this.i2cAddress, NumberFormat.UInt16BE);
        if ((lux_status & 0x0680) == 0x0080) {

            i2c.writeBuffer(this.i2cAddress, [0x00]);

            let raw: number = pins.i2cReadNumber(this.i2cAddress, NumberFormat.UInt16BE);
            let exponent: number = raw >> 12;
            let fractResult: number = raw & 0xfff;
            let shiftedExponent: number = 1 << exponent;
            let lux: number = 0.01 * shiftedExponent * fractResult;

            this.value = lux;
            this.lastMeasurement = input.runningTime();
        }
    }
}

/***  _____  ______ _           __     __***/
/*** |  __ \|  ____| |        /\\ \   / /***/
/*** | |__) | |__  | |       /  \\ \_/ / ***/
/*** |  _  /|  __| | |      / /\ \\   /  ***/
/*** | | \ \| |____| |____ / ____ \| |   ***/
/*** |_|  \_\______|______/_/    \_\_|   ***/
class RelayModule extends Sensor {
    public constructor(i2cAddress: number, measurementDelay: number) {
        super(i2cAddress, measurementDelay);
        this.init();
    }

    private init() {
        if (!this.initialized) {
            helperFunctions.tca9534aInit(this.i2cAddress);

            helperFunctions.tca9534aWritePort(this.i2cAddress, ((0x40) | (0x10)));

            helperFunctions.tca9534aSetPortDirection(this.i2cAddress, 0x00);

            this.initialized = true;
        }
    }

    public setState(state: RelayState) {
        if (!this.initialized) {
            this.init();
        }

        if (state == RelayState.On) {
            helperFunctions.tca9534aWritePort(this.i2cAddress, ((0x10) | (0x20)));
        }
        else {
            helperFunctions.tca9534aWritePort(this.i2cAddress, ((0x40) | (0x80)));
        }
        basic.pause(50);
        helperFunctions.tca9534aWritePort(this.i2cAddress, 0);
    }
}

/***  ____          _____   ____  __  __ ______ _______ ______ _____  ***/
/*** |  _ \   /\   |  __ \ / __ \|  \/  |  ____|__   __|  ____|  __ \ ***/
/*** | |_) | /  \  | |__) | |  | | \  / | |__     | |  | |__  | |__) |***/
/*** |  _ < / /\ \ |  _  /| |  | | |\/| |  __|    | |  |  __| |  _  / ***/
/*** | |_) / ____ \| | \ \| |__| | |  | | |____   | |  | |____| | \ \ ***/
/*** |____/_/    \_\_|  \_\\____/|_|  |_|______|  |_|  |______|_|  \_\***/
class BarometerTag extends Sensor {

    private altitude: number = 0;

    public constructor(i2cAddress: number, measurementDelay: number) {
        super(i2cAddress, measurementDelay);
        this.init();
    }

    public getAltidude() {
        if (!this.initialized) {
            basic.pause(10);
            this.measure();
        }
        return Math.trunc(this.altitude);
    }

    private init() {
        if (!this.initialized) {
            if (i2c.writeBuffer(this.i2cAddress, [0x26, 0x04]) != 0) {
                return;
            }
            this.initialized = true;
            basic.pause(1500);
        }
    }

    public measure() {
        //PRESSURE
        if (i2c.writeBuffer(this.i2cAddress, [0x26, 0x38]) != 0) {
            return;
        }

        i2c.writeBuffer(this.i2cAddress, [0x13, 0x07]);

        i2c.writeBuffer(this.i2cAddress, [0x26, 0x3a]);
        basic.pause(1500);

        i2c.writeBuffer(this.i2cAddress, [0x00]);

        let pre_status = i2c.readNumber(this.i2cAddress, [0x00])
        pins.i2cReadNumber(this.i2cAddress, 1);

        if (pre_status == 0x0e) {

            let resultBuf: Buffer = i2c.readBuffer(this.i2cAddress, [0x01], 5);
            let firstParam: NumberFormat.UInt32BE = resultBuf[1] << 16;
            let secondParam: NumberFormat.UInt32BE = resultBuf[2] << 8;
            let thirdParam: NumberFormat.UInt32BE = resultBuf[3];
            thirdParam = thirdParam << 8;

            let out_p: NumberFormat.Int32BE = firstParam | secondParam | thirdParam;
            let pascal: NumberFormat.Float32BE = (out_p) / 64.0;

            this.value = pascal;

            basic.pause(20);

            //ALTITUDE
            i2c.writeBuffer(this.i2cAddress, [0x26, 0xb8]);

            i2c.writeBuffer(this.i2cAddress, [0x13, 0x07]);

            i2c.writeBuffer(this.i2cAddress, [0x26, 0xba]);
            basic.pause(1500);

            i2c.writeBuffer(this.i2cAddress, [0]);

            let alt_status = pins.i2cReadNumber(this.i2cAddress, 1);

            if (alt_status == 0x0e) {
                i2c.writeBuffer(this.i2cAddress, [0x01]);

                let resultBuf: Buffer = pins.i2cReadBuffer(this.i2cAddress, 5);
                let firstParam: NumberFormat.UInt32BE = resultBuf[1] << 24;
                let secondParam: NumberFormat.UInt32BE = resultBuf[2] << 16;
                let thirdParam: NumberFormat.UInt32BE = (resultBuf[3] & 0xf0);
                thirdParam = thirdParam << 8;

                let out_pa: NumberFormat.Int32BE = firstParam | secondParam | thirdParam;
                let meter: NumberFormat.Float32BE = (out_pa) / 65536.0;
                this.altitude = meter;

            }
        } 
        this.lastMeasurement = input.runningTime();
    }
}

/*** __      ______   _____ ***/
/*** \ \    / / __ \ / ____|***/
/***  \ \  / / |  | | |     ***/
/***   \ \/ /| |  | | |     ***/
/***    \  / | |__| | |____ ***/
/***     \/   \____/ \_____|***/
class VocTag extends Sensor {

    public constructor(i2cAddress: number, measurementDelay: number) {
        super(i2cAddress, measurementDelay);
        this.init();
    }

    private init() {
        if (!this.initialized) {
            i2c.readBuffer(this.i2cAddress, [0x20, 0x2f], 3);

            if (i2c.writeBuffer(this.i2cAddress, [0x20, 0x03]) != 0) {
                this.initialized = false;
                return;
            }
            this.initialized = true;
        }
    }

    public measureTVOC() {
        if (!this.initialized) {
            this.init();
        }

        let outBuf: Buffer;

        let crcBuf: number[] = [0x00, 0x00];

        let crc = helperFunctions.calculateCrc(crcBuf, 2);

        if (i2c.writeBuffer(this.i2cAddress, [0x20, 0x61, 0x00, 0x00, crc]) != 0) {
            return;
        }
        basic.pause(30);

        i2c.writeBuffer(this.i2cAddress, [0x20, 0x08]);
        basic.pause(30);

        outBuf = pins.i2cReadBuffer(this.i2cAddress, 6);

        let co2eq = (outBuf[0] << 8) | outBuf[1];
        let tvoc = (outBuf[3] << 8) | outBuf[4];

        this.value = tvoc;
        this.lastMeasurement = input.runningTime();
    }
}

/*** __      ______   _____      _      _____  ***/
/*** \ \    / / __ \ / ____|    | |    |  __ \ ***/
/***  \ \  / / |  | | |   ______| |    | |__) |***/
/***   \ \/ /| |  | | |  |______| |    |  ___/ ***/
/***    \  / | |__| | |____     | |____| |     ***/
/***     \/   \____/ \_____|    |______|_|     ***/
class VocLpTag extends Sensor {

    public constructor(i2cAddress: number, measurementDelay: number) {
        super(i2cAddress, measurementDelay);
        this.init();
    }

    private init() {
        if (!this.initialized) {
            i2c.readBuffer(this.i2cAddress, [0x20, 0x2f], 3);

            if (i2c.writeBuffer(this.i2cAddress, [0x20, 0xae]) != 0) {
                this.initialized = false;
                return;
            }
            this.initialized = true;
        }
    }

    public measureVOC_LP() {
        if (!this.initialized) {
            this.init();
        }

        let outBuf: Buffer;

        let crcBuf: number[] = [0x00, 0x00];
        let crc = helperFunctions.calculateCrc(crcBuf, 2);

        if (i2c.writeBuffer(this.i2cAddress, [0x20, 0x61, 0x00, 0x00, crc]) != 0) {
            return;
        }
        basic.pause(30);

        i2c.writeBuffer(this.i2cAddress, [0x20, 0x08]);
        basic.pause(150);

        outBuf = pins.i2cReadBuffer(this.i2cAddress, 6);

        let tvoc = (outBuf[0] << 8) | outBuf[1];

        this.value = tvoc;
        this.lastMeasurement = input.runningTime();
    }
}

/***  _    _ _    _ __  __ _____ _____ _____ _________     __***/
/*** | |  | | |  | |  \/  |_   _|  __ \_   _|__   __\ \   / /***/
/*** | |__| | |  | | \  / | | | | |  | || |    | |   \ \_/ / ***/
/*** |  __  | |  | | |\/| | | | | |  | || |    | |    \   /  ***/
/*** | |  | | |__| | |  | |_| |_| |__| || |_   | |     | |   ***/
/*** |_|  |_|\____/|_|  |_|_____|_____/_____|  |_|     |_|   ***/
class HumidityTag extends Sensor {
    
    public constructor(i2cAddress: number, measurementDelay: number) {
        super(i2cAddress, measurementDelay);
        this.init();
    }

    private init() {
        if (!this.initialized) {
            if (i2c.writeBuffer(this.i2cAddress, [0xfe]) != 0) {
                this.initialized = false;
                return;
            }
            this.initialized = true;
            basic.pause(20);
        }
    }

    public measureHumidity() {

        if (!this.initialized) {
            this.init();
        }
        i2c.writeBuffer(this.i2cAddress, [0xf5]);
        basic.pause(50);

        let rh = pins.i2cReadBuffer(this.i2cAddress, 2);

        let raw = rh[0] << 8 | rh[1];
        let percentage = -6 + 125 * raw / 65536

        this.value = percentage;
        this.lastMeasurement = input.runningTime();
    }
}

/***  _______ ______ __  __ _____  ______ _____         _______ _    _ _____  ______ ***/
/*** |__   __|  ____|  \/  |  __ \|  ____|  __ \     /\|__   __| |  | |  __ \|  ____|***/
/***    | |  | |__  | \  / | |__) | |__  | |__) |   /  \  | |  | |  | | |__) | |__   ***/
/***    | |  |  __| | |\/| |  ___/|  __| |  _  /   / /\ \ | |  | |  | |  _  /|  __|  ***/
/***    | |  | |____| |  | | |    | |____| | \ \  / ____ \| |  | |__| | | \ \| |____ ***/
/***    |_|  |______|_|  |_|_|    |______|_|  \_\/_/    \_\_|   \____/|_|  \_\______|***/
class TemperatureTag extends Sensor {
    
    public constructor(i2cAddress: number, measurementDelay: number) {
        super(i2cAddress, measurementDelay);
        this.init();
    }

    private init() {
         if (i2c.writeBuffer(this.i2cAddress, [0x01, 0x80]) != 0) {
            this.initialized = false;
            return;
        }
        this.initialized = true;
    }

    public measureTemperature() {
        let t;
        let tmp112;

        i2c.writeBuffer(this.i2cAddress, [0x00]);

        t = pins.i2cReadBuffer(this.i2cAddress, 2);
        tmp112 = t[0] + (t[1] / 100)

        t = tmp112;
        this.value = t;
        this.lastMeasurement = input.runningTime();
    }
}

/***  ____       _______ _______ ______ _______     __***/
/*** |  _ \   /\|__   __|__   __|  ____|  __ \ \   / /***/
/*** | |_) | /  \  | |     | |  | |__  | |__) \ \_/ / ***/
/*** |  _ < / /\ \ | |     | |  |  __| |  _  / \   /  ***/
/*** | |_) / ____ \| |     | |  | |____| | \ \  | |   ***/
/*** |____/_/    \_\_|     |_|  |______|_|  \_\ |_|   ***/
class BatteryModule {

    private voltage = 0;
    private moduleType: BatteryModuleType;
    public initialized: boolean = false;
    public lastMeasurement: number;
    public measurementDelay: number = BATTERY_MEASUREMENT_DELAY;

    public getVoltage(): number {
        return this.voltage;
    }

    public constructor(type: BatteryModuleType) {
        this.initialized = true;
        this.moduleType = type;
    }

    public measureVoltage() {
        if (this.moduleType == BatteryModuleType.Mini) {
            pins.digitalWritePin(DigitalPin.P1, 0);
            basic.pause(100);

            let result: number = pins.analogReadPin(AnalogPin.P0);

            pins.analogWritePin(AnalogPin.P1, 1023);
            this.voltage = (3 / 1024 * result / 0.33) + 0.1;
        }
        else {
            pins.digitalWritePin(DigitalPin.P1, 1);
            basic.pause(100);

            let result: number = pins.analogReadPin(AnalogPin.P0);

            pins.digitalWritePin(DigitalPin.P1, 0);
            this.voltage = 3 / 1024 * result / 0.13;
        }
        this.lastMeasurement = input.runningTime();
    }
}

/***  _____ ____ ___  ***/
/*** / ____/ __ \__ \ ***/
/***| |   | |  | | ) |***/
/***| |   | |  | |/ / ***/
/***| |___| |__| / /_ ***/
/*** \_____\____/____|***/
class CO2Module extends Sensor {

    public constructor(i2cAddress: number, measurementDelay: number) {
        super(i2cAddress, measurementDelay);
        this.initialized = false;
        control.inBackground(function () {
            this.init();  
        })
    }

    private init() {
        helperFunctions.tca9534aInit(0x38);
        helperFunctions.tca9534aWritePort(0x38, 0x00);
        helperFunctions.tca9534aSetPortDirection(0x38, (~(0x01) & ~(0x10)) & (~(0x40)));

        basic.pause(1);

        helperFunctions.tca9534aSetPortDirection(0x38, (~(0x01) & ~(0x10)));


        basic.pause(1);

        helperFunctions.sc16is740Init(I2C_ADDRESS_MODULE_CO2_FIFO);

        /**CHARGE */
        this.moduleCo2ChargeEnable(true);
        basic.pause(60000);
        this.moduleCo2ChargeEnable(false);
        this.initialized = true;
    }

    public measureCO2() {

        let co2Pressure = 10124;
        let sensorState: Buffer = pins.createBuffer(23);
        let firstMeasurementDone = false;
        let length: number = 8;
        let buf: Buffer;

        if (!this.initialized) {
            this.value = NaN;
        }

        this.moduleCo2DeviceEnable(true);

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

            let crc16 = this.lp8CalculateCrc16(buf, 31);

            buf[31] = crc16;
            buf[32] = crc16 >> 8;
            buf.shift(-1);

            length = 33;

        }
        this.moduleCo2UartEnable(true);
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
        if (this.lp8CalculateCrc16(readBuf, 4) != 0) {
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


        this.moduleCo2UartEnable(true);
        i2c.writeBuffer(I2C_ADDRESS_MODULE_CO2_FIFO, [0x00, 0xfe, 0x44, 0x00, 0x80, 0x2c, 0x79, 0x39]);
        basic.pause(120);

        /**MEASURE READ */

        spacesAvaliable = i2c.readNumber(I2C_ADDRESS_MODULE_CO2_FIFO, [0x48]);
        pins.i2cWriteNumber(I2C_ADDRESS_MODULE_CO2_FIFO, 0x00, NumberFormat.Int8LE);
        readBuf = pins.i2cReadBuffer(I2C_ADDRESS_MODULE_CO2_FIFO, 49);
        this.moduleCo2UartEnable(false);
        this.moduleCo2DeviceEnable(false);

        if (readBuf[0] != 0xfe) {
            return -1;
        }
        if (readBuf[1] != 0x44) {
            return -1;
        }
        if (this.lp8CalculateCrc16(readBuf, 49) != 0) {
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

        this.value = concentration;
        this.lastMeasurement = input.runningTime();
        
        return 0;
    }

    private moduleCo2DeviceEnable(state: boolean) {
        let direction: number = (~(0x01) & ~(0x10));

        if (state) {
            direction &= (~(0x04)) & (~(0x02)) & (~(0x08));
        }
        helperFunctions.tca9534aSetPortDirection(I2C_ADDRESS_MODULE_CO2_EXP, direction);
    }

    private moduleCo2ChargeEnable(state: boolean) {
        let direction: number = (~(0x00) & ~(0x10));

        if (state) {
            direction &= (~(0x04)) & (~(0x02));
        }
        return helperFunctions.tca9534aSetPortDirection(I2C_ADDRESS_MODULE_CO2_EXP, direction);
    }

    private moduleCo2UartEnable(state: boolean) {
        if (state) {
            helperFunctions.sc16is740ResetFifo(2);
        }
    }

    private lp8CalculateCrc16(buffer: Buffer, length: number): number {

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
//% groups=['PIR Module', 'Tags', 'Infragrid Module', 'Power Module' 'PIR Module', 'Relay Module', 'Battery Module', 'CO2 Module']
namespace hardwario {

    let luxTagInstance: LuxTag = null; 
    let relayModuleInstance: RelayModule = null;
    let barometerTagInstance: BarometerTag = null;
    let vocTagInstance: VocTag = null;
    let vocLpTagInstance: VocLpTag = null;
    let temperatureTagInstance: TemperatureTag = null;
    let humidityTagInstance: HumidityTag = null;
    let batteryModuleInstance: BatteryModule = null;
    let co2ModuleInstance: CO2Module = null;
    //let pirModuleInstance: PirModule = null;

    /**
    * Reads the current value of light intensity from the Sensor.
	    * Returns illuminance in lux.
    */
    //%block="illuminance"
    //% group="Tags"
    export function illuminance(): number {
        if (luxTagInstance == null) {
            luxTagInstance = new LuxTag(I2C_ADDRESS_TAG_LUX, LIGHT_MEASUREMENT_DELAY);
        }

        if (!measurementTaskStarted) {
            basic.pause(50);
            if (!measurementTaskStarted) {
                measurementTask();
            }
        }
        return luxTagInstance.getValue();
    }

    /**
    * Sets the delay between measurements on chosen Sensor to value in ms.
    */
    //%block="change $sensorType measurement delay to $delay"
    //% delay.min=1500 delay.max=60000 delay.defl=3000
    //% sensorType.fieldEditor="gridpicker"
    //% sensorType.fieldOptions.width=220
    //% sensorType.fieldOptions.columns=3
    export function measurementDelay(sensorType: MeasurementDelays, delay: number) {

        switch (sensorType) {
            case MeasurementDelays.Light:
                LIGHT_MEASUREMENT_DELAY = delay;
                break;
            case MeasurementDelays.Barometer:
                BAROMETER_MEASUREMENT_DELAY = delay;
                break;
            case MeasurementDelays.Battery:
                BATTERY_MEASUREMENT_DELAY = delay;
                break;
            case MeasurementDelays.Co2:
                CO2_MEASUREMENT_DELAY = delay;
                break;
            case MeasurementDelays.Humidity:
                HUMIDITY_MEASUREMENT_DELAY = delay;
                break;
            case MeasurementDelays.Temperature:
                TEMPERATURE_MEASUREMENT_DELAY = delay;
                break;
            case MeasurementDelays.Voc:
                VOC_MEASUREMENT_DELAY = delay;
                break;
            case MeasurementDelays.All:
                LIGHT_MEASUREMENT_DELAY = delay;
                BAROMETER_MEASUREMENT_DELAY = delay;
                BATTERY_MEASUREMENT_DELAY = delay;
                CO2_MEASUREMENT_DELAY = delay;
                HUMIDITY_MEASUREMENT_DELAY = delay;
                TEMPERATURE_MEASUREMENT_DELAY = delay;
                VOC_MEASUREMENT_DELAY = delay;
                break;
        }
    }

    /**
    * Reads the current value of CO2 in air from the Sensor on CO2 Module.
	    * Returns concentration of CO2 in air.
    */
    //%block="co2"
    //% group="CO2 Module"
    export function co2(): number {
        if (co2ModuleInstance == null) {
            co2ModuleInstance = new CO2Module(I2C_ADDRESS_MODULE_CO2_FIFO, CO2_MEASUREMENT_DELAY);
        }
        if (!measurementTaskStarted) {
            basic.pause(45);
            if (!measurementTaskStarted) {
                measurementTask();
            }
        }
        return co2ModuleInstance.getValue();
    }

    /**
    * Reads the current value of temperature from the Sensor.
	    * Returns temperature in celsius. 
    */
    //%block="temperature"
    //% group="Tags"
    export function temperature(): number {
        if (temperatureTagInstance == null) {
            temperatureTagInstance = new TemperatureTag(I2C_ADDRESS_TAG_TEMPERATURE, TEMPERATURE_MEASUREMENT_DELAY);
        }
        if (!measurementTaskStarted) {
            basic.pause(40);
            if (!measurementTaskStarted) {
                measurementTask();
            }
        }
        return temperatureTagInstance.getValue();
    }

    /**
    * Reads the current value of humidity from the Sensor.
	    * Returns relative humidity in percent. 
    */
    //%block="humidity"
    //% group="Tags"
    export function humidity(): number {
        if (humidityTagInstance == null) {
            humidityTagInstance = new HumidityTag(I2C_ADDRESS_TAG_HUMIDITY, HUMIDITY_MEASUREMENT_DELAY);
        }
        if (!measurementTaskStarted) {
            basic.pause(35);
            if (!measurementTaskStarted) {
                measurementTask();
            }
        }
        return humidityTagInstance.getValue();
    }

    /**
    * Reads the current concentration of voc(volatile organic compound) in the air from the Sensor.
        * Returns total voc(tvoc) in the air in ppm.
    */
    //%block="voc"
    //% group="Tags"
    export function voc(): number {
        if (vocTagInstance == null) {
            vocTagInstance = new VocTag(I2C_ADDRESS_TAG_VOC, VOC_MEASUREMENT_DELAY);
        }

        if (!measurementTaskStarted) {
            basic.pause(30);
            if (!measurementTaskStarted) {
                measurementTask();
            }
        }
        return vocTagInstance.getValue();
    }

    /**
    * Reads the current concentration of voc(volatile organic compound) in the air from the low-power Sensor.
        * Returns total voc(tvoc) in the air in ppm.
    */
    //%block="voc | lp"
    //% group="Tags"
    export function vocLP(): number {
        if (vocLpTagInstance == null) {
            vocLpTagInstance = new VocLpTag(I2C_ADDRESS_TAG_VOC, VOC_MEASUREMENT_DELAY);
        }

        if (!measurementTaskStarted) {
            basic.pause(25);
            if (!measurementTaskStarted) {
                measurementTask();
            }
        }
        return vocLpTagInstance.getValue();
    }

    /**
    * Reads the current altitude from the barometer Sensor.
	    * Returns meters above sea level.
    */
    //%block="altitude"
    //% group="Tags"
    export function altitude(): number {
        basic.pause(40);
        if (barometerTagInstance == null) {
            barometerTagInstance = new BarometerTag(I2C_ADDRESS_TAG_BAROMETER, BAROMETER_MEASUREMENT_DELAY);
        }
        if (!measurementTaskStarted) {
            basic.pause(20);
            if (!measurementTaskStarted) {
                measurementTask();
            }
        }
        return barometerTagInstance.getAltidude();
    }

    /**
    * Reads the current atmospheric pressure from the barometer Sensor.
	    * Returns atmospheric pressure in pascals.
    */
    //%block="pressure"
    //% group="Tags"
    export function pressure(): number {
        if (barometerTagInstance == null) {
            barometerTagInstance = new BarometerTag(I2C_ADDRESS_TAG_BAROMETER, BAROMETER_MEASUREMENT_DELAY);
        }
        if (!measurementTaskStarted) {
            basic.pause(15);
            if (!measurementTaskStarted) {
                measurementTask();
            }
        }
        return barometerTagInstance.getValue();
    }

    /**
    * Get battery voltage of the batteries in Battery Module. You have to choose if you have
    * Battery Module (4 cells) or Mini Battery Module (2 cells).
    */
    //%block="voltage on $type | battery module"
    //% group="Battery Module"
    export function batteryVoltage(type: BatteryModuleType): number {
        if (batteryModuleInstance == null) {
            batteryModuleInstance = new BatteryModule(type);
        }
        if (!measurementTaskStarted) {
            basic.pause(10);
            if (!measurementTaskStarted) {
                measurementTask();
            }
        }
        return batteryModuleInstance.getVoltage();
    }

    /**
    * Sets the state of bi-stable relay on the Relay Module to on/off.
    */
    //%block="set relay state $state"
    //% group="Relay Module"
    export function setRelay(state: RelayState) {
        if (relayModuleInstance == null) {
            relayModuleInstance = new RelayModule(I2C_ADDRESS_MODULE_RELAY_TCA9534, 0);
        }
        control.inBackground(function () {
            relayModuleInstance.setState(state);
        })
    }

    /**
    * Sets the state of relay on the Power Module to on/off.
    */
    //%block="set power relay state $state"
    //% group="Power Module"
    export function setPowerModuleRelay(state: RelayState) {
        if(state == RelayState.Off) {
            pins.digitalWritePin(DigitalPin.P0, 0);
        }
        else {
            pins.digitalWritePin(DigitalPin.P0, 1);
        }
    }

    /**
    * Sets the state of bi-stable relay on the Relay Module to on/off.
    */
    //%block="lcd"
    /*export function lcdStart() {
        lcdModule.init();
    }*/
    

    /**
    * 
    */
    //%block="infragrid"
    //% group="Infragrid Module"
    export function infragrid() {
        infragridModule.init();
    }



    /**
     * Registers code to run when there is a movement registered by PIR motion detector on PIR module. 
     * You have to run Motion block at the Start or anywhere before this event can occure because the PIR Module is not initialized by default.
     */
    //%block="on movement"
    //% group="PIR Module"
    export function onMovement(body: () => void) {
        control.onEvent(Events.Movement, -10, body);
    }

    function measurementTask() {
        measurementTaskStarted = true;
        
        control.inBackground(function () {
            while (true) {
                if (temperatureTagInstance != null && temperatureTagInstance.initialized 
                && helperFunctions.checkTimeFromLastMeasurement(temperatureTagInstance)) {
                    temperatureTagInstance.measureTemperature();
                }
                if (humidityTagInstance != null && humidityTagInstance.initialized 
                && helperFunctions.checkTimeFromLastMeasurement(humidityTagInstance)) {
                    humidityTagInstance.measureHumidity();
                }
                if (batteryModuleInstance != null && batteryModuleInstance.initialized 
                && helperFunctions.checkTimeFromLastMeasurement(batteryModuleInstance)) {
                    batteryModuleInstance.measureVoltage();
                }
                if (vocLpTagInstance != null && vocLpTagInstance.initialized 
                && helperFunctions.checkTimeFromLastMeasurement(vocLpTagInstance)) {
                    vocLpTagInstance.measureVOC_LP();
                }
                if (co2ModuleInstance != null && co2ModuleInstance.initialized 
                && helperFunctions.checkTimeFromLastMeasurement(co2ModuleInstance)) {
                    co2ModuleInstance.measureCO2();
                }                
                if (vocTagInstance != null && vocTagInstance.initialized 
                && helperFunctions.checkTimeFromLastMeasurement(vocTagInstance)) {
                    vocTagInstance.measureTVOC();
                }
                if (luxTagInstance != null && luxTagInstance.initialized 
                && helperFunctions.checkTimeFromLastMeasurement(luxTagInstance)) {
                    luxTagInstance.measureIlluminance();
                }
                if (barometerTagInstance != null && barometerTagInstance.initialized 
                && helperFunctions.checkTimeFromLastMeasurement(barometerTagInstance)) {
                    control.inBackground(function () {
                        barometerTagInstance.measure();
                    })
                }
                basic.pause(1);
            }
        })
    }

    //%block="configure PIR module || sensitivity: $sensitivity|set Blind Time: $blindTime|set Pulse Conunter: $pulseCounter|set Window Time: $windowTime"
    //% sensitivity.min=0 sensitivity.max=255 sensitivity.defl=35
    //% blindTime.min=0 blindTime.max=15 blindTime.defl=0
    //% pulseCounter.min=0 pulseCounter.max=3 pulseCounter.defl=0
    //% windowTime.min=0 windowTime.max=3 windowTime.defl=0
    //% expandableArgumentMode="toggle"
    //% group="PIR Module"
    export function motionDetectorTask(sensitivity? : number, blindTime? : number, 
                                       pulseCounter? : number, windowTime? : number) {

        let dlPin : DigitalPin = DigitalPin.P8;
        let serinPin : DigitalPin = DigitalPin.P16;

        control.inBackground(function () {
            let motionInit: boolean = false;
            let oldState: number = 0;

            while (true) {

                if (!motionInit) 
                {
                    pirModule.startMotionSensor(dlPin, serinPin, sensitivity, blindTime, pulseCounter, windowTime);

                    motionInit = true;
                }
                else
                {
                    let state: number;
                    state = pins.digitalReadPin(dlPin);

                    if (state != 0 && oldState == 0)
                    {
                        control.raiseEvent(Events.Movement, -10);

                        pins.digitalWritePin(dlPin, 0);
                        control.waitMicros(100);
                        pins.digitalReadPin(dlPin);
                        control.waitMicros(100);
                    }

                    oldState = state;
                    basic.pause(50);
                }
            }
        })
    }
}
