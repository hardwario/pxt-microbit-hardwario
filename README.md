<a href="https://www.hardwario.com/"><img src="https://www.hardwario.com/ci/assets/hw-logo.svg" width="200" alt="HARDWARIO Logo" align="right"></a>

# HARDWARIO - micro:bit Integration 
---
[![Travis](https://img.shields.io/travis/bigclownprojects/pxt-HARDWARIO/master.svg)](https://travis-ci.org/bigclownprojects/pxt-HARDWARIO)
[![Release](https://img.shields.io/github/release/bigclownprojects/pxt-HARDWARIO.svg)](https://github.com/bigclownprojects/pxt-HARDWARIO)
[![License](https://img.shields.io/github/license/bigclownprojects/pxt-HARDWARIO.svg)](https://github.com/bigclownprojects/pxt-HARDWARIO/blob/master/LICENSE)
[![Twitter](https://img.shields.io/twitter/follow/hardwario_en.svg?style=social&label=Follow)](https://twitter.com/hardwario_en)
 ---
 
 <img src="https://github.com/bigclownprojects/pxt-HARDWARIO/blob/master/src/img/microbit_main.png?raw=true" width="200" alt="micro:bit main" align="right"></a>
 
This document describes the concept of the micro:bit integration into the HARDWARIO IoT Kit (further referred to just as "IoT Kit"). The IoT Kit offers a huge variety of pluggable modules that can be easily used not for educational purposes, but also for industrial applications and have been battle-tested in a number of pilot projects.

## System Concept
The IoT Kit uses Core Module as its main control element. It has its own MCU and radio to exchange data with a wireless gateway. Contrary to that, the micro:bit could replace its role and IoT Kit would represent an accessory extension to the micro:bit mainboard.

## Mechanical Concept 
A nice feature of the micro:bit board is the LED matrix and the fact it has 2 push buttons. Hereby the module should be  visible - basically, stay on the top of the other components in the ecosystem. 


Therefore we should create the micro:bit adapter that will sit above the HARDWARIO IoT Kit assembly. Such composition will be bold and attractive for the micro:bit enthusiasts.

## Signal Mapping
Obviously, the signal mapping will not cover 100% of the IoT Kit use-cases. The following suggestion focuses on the most prominent scenarios.

![](https://github.com/bigclownprojects/pxt-HARDWARIO/blob/master/src/img/core_pinout.png?raw=true) ![](https://github.com/bigclownprojects/pxt-HARDWARIO/blob/master/src/img/microbit_pinout.png?raw=true)


| Domain              | micro:bit                              | IoT Kit Header                             |
|---------------------|----------------------------------------|--------------------------------------------|
| POWER               | GND<br>+3v3                            | GND<br>VDD                                 |
| I2C                 | P20<br>P19                             | SDA0<br>SCL0                               |
| SPI                 | P16<br>P13/SCK<br>P15/MOSI<br>P14/MISO | P15/CS<br>P14/SCLK<br>P13/MOSI<br>P12/MISO |
| Battery measurement | P0<br>P1                               | P0/A0<br>P1/A1                             |
| PIR Module          | P8<br>---<br><br>P2                    | P8<br>---<br><br>P9                        |




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

---


Made with &#x2764;&nbsp; by [**HARDWARIO s.r.o.**](https://www.hardwario.com/) in the heart of Europe.


