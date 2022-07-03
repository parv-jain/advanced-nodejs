const fs = require('fs');

const conversionMap = {
    '88': '65',
    '89': '66',
    '90': '67',
};

fs.readFile(__filename, (err, buffer) => {
    let tag = buffer.slice(-4);
    // references the same memory as the original, but offset and cropped by the start and end indices.
    for(let i = 0; i < tag.length; i++) {
        tag[i] = conversionMap[tag[i]]; // it will not only changed the sliced buffer, but also the original buffer
        // because they share the same memory space
    }
    console.log(buffer.toString());
});

// It converts last three bytes of file according to conversion map
// tag: XYZ