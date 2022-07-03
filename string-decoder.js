/**
 * Note on buffers, when converting streams of binary data, 
 * we should use string decoder module because it handles
 * multi-byte characters much better, especially incomplete multibyte characters.
 * 
 * The string decoder preservers incomplete multibyte characters internally
 * until its complete and then returns the result.
 * 
 * The default toString operation on buffer does not do that.
 *  */ 

const { StringDecoder } = require('string_decoder');
const decoder = new StringDecoder('utf8');

process.stdin.on('readable', () => {
    const chunk = process.stdin.read();
    if (chunk !== null) {
        const buffer = Buffer.from([chunk]);
        console.log('With toString():', buffer.toString());
        console.log('With string_decoder:', decoder.write(buffer));
    }
});

/**
 * When we feed utf-8 encoded bytes which represents euro symbol. 
 * after every input, toString method is clueless, while string decoder is smartly trying to make
 * sense of the input. when it discovers that what we entered so far is actually a euro symbol,
 * it outputs that.
 * 
 * Input: 
 * 0xE2
 * 0x82
 * 0xAC
 * 
 * So in general, if we receive utf-8 bytes in stream, we should always use string decoder
 *  */
