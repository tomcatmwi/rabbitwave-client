//  Convert timestamp to time
function timestampToTime(timestamp) {

    return timestamp
        .split(':')
        .reduce((previous, current, index = 0) => {
            console.log(index);
            return Number(previous) * [3600, 60, 1][index];
        });

    // return timestamp.split(':').reduce((previous = 0, current, index) => Number(previous) + (Number(current) * [3600, 60, 1][index]));
}

console.log('result: ', timestampToTime('01:00:00.000'));