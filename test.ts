/**
 * Set Relay Module bi-stable relay state on button press
 */
input.onButtonPressed(Button.B, function () {
    hardwario.setRelay(RelayState.Off)
})
input.onButtonPressed(Button.A, function () {
    hardwario.setRelay(RelayState.On)
})

/**
 * Run all the measurements on all the supported Modules and Tags
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
