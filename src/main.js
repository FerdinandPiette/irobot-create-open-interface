import polyfill from 'babel-polyfill';
import { install } from 'source-map-support';
install();

import Robot from './Robot';
import sensors from './sensors';

export { Robot, sensors };
