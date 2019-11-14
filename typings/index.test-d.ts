
import { expectType, expectError } from 'tsd';

import * as s from '.';
import { Either } from './util/Either.js';


expectType<s.DecodeResult<string>>(s.string.decode('x'));
