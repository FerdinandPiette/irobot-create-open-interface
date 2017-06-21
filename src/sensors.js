var Packet = class Packet {
    constructor(id, name, size, range, unit) {
        this._id = id;
        this._name = name;
        this._dataSize = size;
        this._dataRange = range;
        this._dataUnit = unit;
    }
    getId() {
        return this._id;
    }
    getName() {
        return this._name;
    }
    getDataSize() {
        return this._dataSize;
    }
    getDataRange() {
        return this._dataRange;
    }
    getDataUnit() {
        return this._dataUnit;
    }
    parse(...bytes) {
        var data = 0;
        bytes.forEach((byte, index, array) => {
            data |= (byte << array.length - index - 1);
        });
        return data;
    }
    validate(data) {
        if(Array.isArray(data)) { data = this.parse(data); }
        return data >= this._dataRange[0] && data <= this._dataRange[1];
    }
};

var Data = class Data {
    constructor(packet, data) {
        if(Array.isArray(data)) { data = packet.parse(data); }
        if(!packet.validate(data)) { throw new Error(`Data is not valid : ${data}, ${packet.getName()}`); }
        this._packet = packet;
        this._data = data;
        this._timestamp = Date.now();
    }
    getData() {
        return this._data;
    }
    getPacket() {
        return this._packet;
    }
    getTimestamp() {
        return this._timestamp;
    }
    toString() {
        return `${this.getData()} from packet #${this.getPacket().getId()} (${this.getPacket().getName()}) at time ${new Date(this.getTimestamp())} (${this.getTimestamp()})`;
    }
};

export default {Packet, Data};
