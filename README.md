<a href="https://www.hardwario.com/"><img src="https://www.hardwario.com/ci/assets/hw-logo.svg" width="200" alt="HARDWARIO Logo" align="right"></a>

# HARDWARIO - micro:bit Integration 

[![Travis](https://img.shields.io/travis/bigclownprojects/pxt-HARDWARIO/master.svg)](https://travis-ci.org/bigclownprojects/pxt-HARDWARIO)
[![Release](https://img.shields.io/github/release/bigclownprojects/pxt-HARDWARIO.svg)](https://github.com/bigclownprojects/pxt-HARDWARIO)
[![License](https://img.shields.io/github/license/bigclownprojects/pxt-HARDWARIO.svg)](https://github.com/bigclownprojects/pxt-HARDWARIO/blob/master/LICENSE)
[![Twitter](https://img.shields.io/twitter/follow/hardwario_en.svg?style=social&label=Follow)](https://twitter.com/hardwario_en)
 ---
 
<img src="https://github.com/bigclownprojects/pxt-HARDWARIO/blob/master/src/img/microbit_main.png?raw=true" width="400" alt="micro:bit main" align="right"></a>
 
This document describes the concept of the micro:bit integration into the HARDWARIO IoT Kit (further referred to just as "IoT Kit"). The IoT Kit offers a huge variety of pluggable modules that can be easily used not for educational purposes, but also for industrial applications and have been battle-tested in a number of pilot projects.

## System Concept
The IoT Kit uses Core Module as its main control element. It has its own MCU and radio to exchange data with a wireless gateway. Contrary to that, the micro:bit could replace its role and IoT Kit would represent an accessory extension to the micro:bit mainboard.

## Mechanical Concept 
<img src="https://github.com/bigclownprojects/pxt-HARDWARIO/blob/master/src/img/Micro_bit_schema.png?raw=true" width="300" alt="micro:bit main" align="left"></a>
A nice feature of the micro:bit board is the LED matrix and the fact it has 2 push buttons. Hereby the module should be  visible - basically, stay on the top of the other components in the ecosystem. 


Therefore we should create the micro:bit adapter that will sit above the HARDWARIO IoT Kit assembly. Such composition will be bold and attractive for the micro:bit enthusiasts.
<br><br><br><br><br><br><br><br>

## Signal Mapping
Obviously, the signal mapping will not cover 100% of the IoT Kit use-cases. The following suggestion focuses on the most prominent scenarios.

<img src="https://github.com/bigclownprojects/pxt-HARDWARIO/blob/master/src/img/core_pinout.png?raw=true" width="400" alt="micro:bit main" align="left"></a>
<img src="https://github.com/bigclownprojects/pxt-HARDWARIO/blob/master/src/img/microbit_pinout.png?raw=true" width="400" alt="micro:bit main" align="right"></a>

| Domain              | micro:bit                              | IoT Kit Header                             |
|---------------------|----------------------------------------|--------------------------------------------|
| Power               | GND<br>+3v3                            | GND<br>VDD                                 |
| I2C                 | P20<br>P19                             | SDA0<br>SCL0                               |
| SPI                 | P16<br>P13/SCK<br>P15/MOSI<br>P14/MISO | P15/CS<br>P14/SCLK<br>P13/MOSI<br>P12/MISO |
| Battery measurement | P0<br>P1                               | P0/A0<br>P1/A1                             |
| PIR Module          | P8<br>P2                               | P8<br>P9                                   |




## Module Compatibility
The following IoT Kit modules will be compatible with the Microbit Module:
 * Battery Module
 * Mini Battery Module
 * PIR Module #
 * CO2 Module
 * Climate Module
 * LCD Module #
 * GPS Module #
 * Infra Grid Module #
 * Relay Module
 * Tag Module (only right side will work)
 * Temperature Tag
 * Humidity Tag
 * Barometer Tag
 * Lux Meter Tag
 * VOC Tag
 * VOC-LP Tag
 * NFC Tag #

// Items with "#" is in developement

Only large 3D-printed enclosures can be used for the micro:bit integration. The whole collection with the slot for the micro:bit connector from the top side can be prepared effortlessly.

## First Steps
The Microbit Module will be designed first. Based on the sample, HARDWARIO will fine-tune the 3D-printed enclosures.

On the firmware side, the initial integration will be done for the CO2 Module, Humidity Tag, Barometer Tag, Lux Meter Tag, and LCD Module. On this kit, the basics of the air quality monitoring can be explained with the possibility to alert excessive values on the micro:bit LED matrix.


# Examples
Code example for making a simple Thermostat with micro:bit showing an icon on LED matrix and HARDWARIO modules measuring the temperature and providing a Relay impulse
```blocks
input.onButtonPressed(Button.A, function () {
    Temp = Temp + 1
    basic.showNumber(Temp)
})
input.onButtonPressed(Button.B, function () {
    Temp = Temp - 1
    basic.showNumber(Temp)
})
let Temp = 0
Temp = 40
basic.forever(function () {
    if (hardwario.temperature() <= Temp) {
        hardwario.setRelay(RelayState.On)
        basic.showIcon(IconNames.Yes)
    } else {
        hardwario.setRelay(RelayState.Off)
        basic.showIcon(IconNames.No)
    }
    basic.pause(2000)
})
```

# Reference
---
## co2 #hardwario-co2
Starts periodic measurement on [HARDWARIO CO2 Module](https://shop.hardwario.com/co2-module/) and returns the value of CO2 in the air. The first initialization takes around 1 minute then it measures every 3 seconds.
```sig
hardwario.co2()
```

## illuminance #hardwario-illuminance
Starts periodic measurement on [HARDWARIO Lux Meter Tag](https://shop.hardwario.com/lux-meter-tag/) and returns the value of light intensity in the lux. 
It updates the value every 3 seconds.
```sig
hardwario.illuminance()
```

## temperature #hardwario-temperature
Starts periodic measurement on [HARDWARIO Temperature Tag](https://shop.hardwario.com/temperature-tag/) and returns the value of temperature in Celsius. 
It updates the value every 3 seconds.
```sig
hardwario.temperature()
```

## voc #hardwario-voc
Starts periodic measurement on [HARDWARIO VOC Tag](https://shop.hardwario.com/voc-tag/) and returns the value of voc(volatile organic compound) in tvoc. 
It updates the value every 3 seconds.
```sig
hardwario.voc()
```

We also have a [Low Power version](https://shop.hardwario.com/voc-lp-tag/) so if you have this Tag you have to use this code:
```sig
hardwario.vocLP()
```

## humidity #hardwario-humidity
Starts periodic measurement on [HARDWARIO Humidity Tag](https://shop.hardwario.com/humidity-tag/) and returns the percentage of humidity in the air. 
It updates the value every 3 seconds.
```sig
hardwario.humidity()
```

## altitude #hardwario-altitude
Starts periodic measurement on [HARDWARIO Barometer Tag](https://shop.hardwario.com/barometer-tag/) and returns the meters above sea level.
It updates the value every 3 seconds.
```sig
hardwario.altitude()
```

## pressure #hardwario-pressure
Starts periodic measurement on [HARDWARIO Barometer Tag](https://shop.hardwario.com/barometer-tag/) and returns the atmospheric pressure in Pascal.
It updates the value every 3 seconds.
```sig
hardwario.pressure()
```

## battery #hardwario-batteryVoltage
Starts periodic measurement on [HARDWARIO Battery Module](https://shop.hardwario.com/battery-module/) or [HARDWARIO Mini Battery Module](https://shop.hardwario.com/mini-battery-module/) and returns Voltage on all the cells in Volts. It updates the value every 3 seconds.

* ``Mini``, choose this if you have a mini version of Battery Module
* ``Standard``, choose this if you have a standard version of Battery Module

```sig
hardwario.batteryVoltage(BatteryModuleType.Mini)
```

## relay #hardwario-setRelay
Set the state of Bi-stable relay on [HARDWARIO Relay Module](https://shop.hardwario.com/relay-module/) to selected state(On/Off).
```sig
hardwario.setRelay(RelayState.On)
```

---

Made with &#x2764;&nbsp; by [**HARDWARIO s.r.o.**](https://www.hardwario.com/) in the heart of Europe.

