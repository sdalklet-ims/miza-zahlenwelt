import { registerWorld } from '../index';
import { enterWorld } from '../../world/worldScreen';
import '../../stations/fluss';

registerWorld('fluss', { enter: () => void enterWorld({ spawnWorld: 'fluss' }) });
