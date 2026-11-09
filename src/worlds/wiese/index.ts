import { registerWorld } from '../index';
import { enterWorld } from '../../world/worldScreen';
import '../../stations/wiese';

registerWorld('wiese', { enter: () => void enterWorld({ spawnWorld: 'wiese' }) });
