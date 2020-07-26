/**
 * Set Relay Module bi-stable relay and power module Relay state on button press
 * SUCCESS - relay switches on the button press
 */
input.onButtonPressed(Button.B, function () {
    hardwario.setPowerModuleRelay(RelayState.Off)
    hardwario.setRelay(RelayState.Off)
})
input.onButtonPressed(Button.A, function () {
    hardwario.setPowerModuleRelay(RelayState.On)
    hardwario.setRelay(RelayState.On)
})

/**
 * Run all the measurements on all the supported Modules and Tags
 * If you have a physical hardware from HARDWARIO you will get all the measured values
 * Othervise everything should be a NaN
 */
basic.showNumber(hardwario.humidity())
basic.showNumber(hardwario.co2())
basic.showNumber(hardwario.illuminance())
basic.showNumber(hardwario.temperature())
basic.showNumber(hardwario.voc())
basic.showNumber(hardwario.altitude())
basic.showNumber(hardwario.pressure())
basic.showNumber(hardwario.batteryVoltage(BatteryModuleType.Mini))
basic.showNumber(hardwario.vocLP())

/**
 * Sets up the motion detector on PIR Module and on movement there should be a hearth icon on the LED matrix
 */
hardwario.motionDetectorTask()
hardwario.onMovement(function () {
    basic.showIcon(IconNames.Heart);
})
