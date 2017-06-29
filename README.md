# irobot-create-open-interface

An implementation of the iRobot Create - Open Interface

## Installation

`npm install irobot-create-open-interface --save`

## Example

```
var irobot = require('irobot-create-open-interface');

const irobotSerial = '/dev/ttyUSB0';

var robot = new irobot.Robot(irobotSerial);
robot.on('connected', () => {
    robot.fullMode();
    robot.streamAllSensors();
});

robot.on('data', data => {
    console.log(data);
});
```

## Documentation

*TODO*
