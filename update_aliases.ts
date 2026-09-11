import fs from 'fs';
import { ALIASES } from './geocode_worker';

// Fix existing aliases
ALIASES['howrah stn'] = 'howrah';
ALIASES['howrah station'] = 'howrah';
ALIASES['howrah'] = 'howrah';
ALIASES['kestopur/baguihati'] = 'baguihati';
ALIASES['baguiati'] = 'baguihati';
ALIASES['subodh mullick square'] = 'subodh mallick square';
ALIASES['s. mullick sq.'] = 'subodh mallick square';
ALIASES['pts more'] = 'pts';
ALIASES['bt college'] = 'b.t. college';
ALIASES['em byapss'] = 'em bypass';
ALIASES['em bypass connector'] = 'em bypass';
ALIASES['grey st'] = 'grey street';

console.log("Aliases updated");
