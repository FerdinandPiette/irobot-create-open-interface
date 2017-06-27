import SerialPort from 'serialport';
//import readline from 'readline';
import EventEmitter from 'events';
import sensors from './sensors'

var Robot = class Robot extends EventEmitter {
    /**
     * 
     */
    constructor(device) {
        super();
        this._options = {
            baudrate: 57600,
            device: device
        };
        this._buffer = [];
        console.log('start serial', this._options.device, this._options.baudrate);
        this._serial = new SerialPort(this._options.device, {
            baudrate: this._options.baudrate,
            dataBits: 8,
            stopBits: 1,
            parity: 'none',
            rtscts: false,
            xon: false,
            xoff: false,
            xany: false,
            parser: this._serialDataParser.bind(this) //SerialPort.parsers.readline('\n')
        })
        .on('open', this._init.bind(this))
        .on('error', function(err) {
            console.log('Error: ', err.message);
        })
        .on('data', function(buffer) {
            console.log('Data received:', Buffer.from(buffer));
        })
        .on('sensordata', this._processSensorData.bind(this));
    }
    _init() {
        console.log('Connected');
        this.passiveMode();
        this.safeMode();
        this.emit('connected');
    }
    /**
     * 
     */
    _sendCommand(command) {
        var buffer = Buffer.from(command);
        console.log('set command', buffer);
        this._serial.write(buffer);
        this._serial.flush();
        return this;
    }
    _serialDataParser(serial, data) {
        this._buffer.push(...data);
        var oldBufferSize = 0;
        while(this._buffer.length > 0 && oldBufferSize !== this._buffer.length) {
            oldBufferSize = this._buffer.length;
            let data = [];
            while(0 < this._buffer[0].length && 19 !== this._buffer[0]) {
                data.push(this._buffer.shift());
            }
            if(0 < data.length) { serial.emit('data', Buffer.from(data)); }
            
            if(this._buffer.length > 2 && this._buffer.length >= this._buffer[1] + 3) {
                console.log('splice size:', this._buffer[1]+3);
                let sensorData = this._buffer.splice(0, this._buffer[1] + 3);
                let checksum = 0;
                for(let i = 0; i < sensorData[1]+3; ++i) {
                    checksum += sensorData[i];
                }
                checksum %= 256;
                if(0 === checksum) {
                    serial.emit('sensordata', sensorData);
                } else {
                    serial.emit('errordata', Buffer.from(sensorData));
                }
            } else {
                break;
            }
        }
    }
    _processSensorData(dataStream) {
        var streamCode = dataStream.shift(); // 19
        var streamDataSize = dataStream.shift();
        var processed = 0;
        while(processed < streamDataSize) {
            let packetId = dataStream.shift();
            let dataSize = Robot.sensorPackets[packetId].getDataSize();
            let data = dataStream.splice(0, dataSize);
            this.emit('data', new sensors.Data(Robot.sensorPackets[packetId], data).toJSON());
//            console.log((new sensors.Data(Robot.sensorPackets[packetId], data)).toString());
            processed += dataSize + 1;
        }
    }
    /**
     * 
     */
    passiveMode() {
        this._sendCommand([128]);
    }
    /**
     * 
     */
    safeMode() {
        this._sendCommand([131]);        
    }
    /**
     * 
     */
    fullMode() {
        this._sendCommand([132]);
    }
    /**
     * 
     */
    sing(notes) {
        var song = [];//new Array(notes.length * 2 + 3);
        song.push(140, 0, notes.length);
        for(let note of notes) {
            song.push(note[0], note[1]);
        }
        this._sendCommand(song);
        this._sendCommand([141,0]);
    }
    /**
     * 
     */
    drive(velocity, radius, direct = false) {
        if(direct) { this.driveDirect(velocity, radius); }
        velocity = parseInt(velocity);
        radius = parseInt(radius);
        this._sendCommand([137, (velocity >> 8) & 255, velocity & 255, (radius >> 8) & 255, radius & 255]);
    }
    /**
     * 
     */
    driveDirect(left, right) {
        left = parseInt(left);
        right = parseInt(right);
        this._sendCommand([145, (left >> 8) & 255, left & 255, (right >> 8) & 255, right & 255]);
    }
    /**
     * 
     */
    stop() {
        this.driveDirect(0,0);
        this.startDemo('abort');
    }
    /**
     * 
     */
    startDemo(number) {
        if('string' === typeof number) { number = Robot.demos[number] || Robot.demos['abort']; }
        this._sendCommand([136, number]);
    }
    setLED(number, color, intensity) {
        if('string' === typeof number) { number = Robot.leds[number]; }
        this._sendCommand([139, number, color, intensity]);
    }
    setDigitalOutputPort(value) {
        this._digitalOutpoutPort = value;
        this._sendCommand([147, value]);
    }
    setDigitalOutputPin(pin, state) {
        this.setDigitalOutputPort(this._digitalOutputPort | ((state ? 1 : 0) << pin));
    }
    getDigitalOutputPort() {
        return this._digitalOutputPort;
    }
    getDigitalOutputState(pin) {
        return this._digitalOutputPort & (1 << pin) ? true : false;
    }
    setPWMLowSideDrivers(driver1, driver2, driver3) {
        this._setCommand([144, driver1, driver2, driver3]);
    }
    /*requestSensor(id) {
        this._sendCommand([142, id]);
    }
    requestSensors(ids) {
        this._sendCommand([149, ids.length, ...ids]);
    }
    requestAllSensors() {
        var ids = [7,8,9,10,11,12,13,14,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42];
        this.requestSensors(ids);
    }*/
    streamSensors(ids) {
        this._sendCommand([148, ids.length, ...ids]);
    }
    streamAllSensors() {
        var ids = Object.keys(Robot.sensorPackets);
        this.streamSensors(ids);
    }
    pauseStreaming() {
        this._sendCommand([150, 0]);
    }
    resumeStreaming() {
        this._sendCommand([150, 1]);
    }
    wait(time) {
        this._sendCommand([155, time]);
    }
    waitDistance(distance) {
        this._sendCommand([156, (distance << 8) & 255, distance & 255]);
    }
    waitAngle(angle) {
        this._sendCommand([157, (angle << 8) & 255, angle & 255]);
    }
    waitEvent(event) {
        if('string' === typeof event) { event = Robot.events[event]; }
        this._sendCommand([158, event]);
    }
};

Robot.demos = {
    'abort': 255,
    'cover': 0,
    'cover-and-dock': 1,
    'spot-cover': 2,
    'mouse': 3,
    'drive-figure-eight': 4,
    'wimp': 5,
    'home': 6,
    'tag': 7,
    'pachelbel': 8,
    'banjo': 9
};

Robot.leds = {
    'advance': 8,
    'play': 2
};

Robot.events = {
    'wheel-drop': 1,
    'front-wheel-drop': 2,
    'left-wheel-drop': 3,
    'right-wheel-drop': 4,
    'bump': 5,
    'left-bump': 6,
    'right-bump': 7,
    'virtual-wall': 8,
    'wall': 9,
    'cliff': 10,
    'left-cliff': 11,
    'front-left-cliff': 12,
    'front-right-cliff': 13,
    'right-cliff': 14,
    'home-base': 15,
    'advance-button': 16,
    'play-button': 17,
    'digital-output-0': 18,
    'digital-output-1': 19,
    'digital-output-2': 20,
    'digital-output-3': 21,
    'passive': 22,
};

Robot.sensorPackets = {
    7: new sensors.Packet(7, 'BumpsAndWheelDrops', 1, [0, 31]), 
    8: new sensors.Packet(8, 'Wall', 1, [0, 1]), 
    9: new sensors.Packet(9, 'CliffLeft', 1, [0, 1]), 
    10: new sensors.Packet(10, 'CliffFrontLeft', 1, [0, 1]), 
    11: new sensors.Packet(11, 'CliffFrontRight', 1, [0, 1]), 
    12: new sensors.Packet(12, 'CliffRight', 1, [0, 1]), 
    13: new sensors.Packet(13, 'VirtualWall', 1, [0, 1]), 
    14: new sensors.Packet(14, 'Overcurrents', 1, [0, 31]), 
    17: new sensors.Packet(17, 'IRByte', 1, [0, 255]), 
    18: new sensors.Packet(18, 'Buttons', 1, [0, 15]),
    19: new sensors.Packet(19, 'Distance', 2, [-32768, 32767], 'mm'), 
    20: new sensors.Packet(20, 'Angle', 2, [-32768, 32767], 'mm'), 
    21: new sensors.Packet(21, 'ChargingState', 1, [0, 5]),
    22: new sensors.Packet(22, 'Voltage', 2, [0, 65535], 'mV'),
    23: new sensors.Packet(23, 'Current', 2, [-32768, 32767], 'mA'), 
    24: new sensors.Packet(24, 'BatteryTemperature', 1, [-128, 127], '°C'),
    25: new sensors.Packet(25, 'BatteryCharge', 2, [0, 65535], 'mAh'),
    26: new sensors.Packet(26, 'BatteryCapacity', 2, [0, 65535], 'mAh'), 
    27: new sensors.Packet(27, 'WallSignal', 2, [0, 4095]), 
    28: new sensors.Packet(28, 'CliffLeftSignal', 2, [0, 4095]), 
    29: new sensors.Packet(29, 'CliffFrontLeftSignal', 2, [0, 4095]), 
    30: new sensors.Packet(30, 'CliffFrontRightSignal', 2, [0, 4095]), 
    31: new sensors.Packet(31, 'CliffRightSignal', 2, [0, 4095]),
    32: new sensors.Packet(32, 'UserDigitalInputs', 1, [0, 31]),
    33: new sensors.Packet(33, 'UserAnalogInputs', 2, [0, 1023]),
    34: new sensors.Packet(34, 'ChargingSourcesAvailable', 1, [0, 3]),
    35: new sensors.Packet(35, 'OIMode', 1, [0, 3]),
    36: new sensors.Packet(36, 'SongNumber', 1, [0, 15]),
    37: new sensors.Packet(37, 'SongPlaying', 1, [0, 1]),
    38: new sensors.Packet(38, 'NumberOfStreamPackets', 1, [0, 42]),
    39: new sensors.Packet(39, 'Velocity', 2, [-500, 500], 'mm/s'),
    40: new sensors.Packet(40, 'Radius', 2, [-32768, 32767], 'mm'),
    41: new sensors.Packet(41, 'RightVelocity', 2, [-500, 500], 'mm/s'), 
    42: new sensors.Packet(42, 'LeftVelocity', 2, [-500, 500], 'mm/s')
};

export default Robot;
