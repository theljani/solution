const { job, start, stop } = require('microjob');
const execute = async () => {
    try {
        // start the worker pool
        await start();

        const result = await job(async () => {

            const axios = require('axios');

            const asyncForEach = async (array, callback) => {
                for (let index = 0; index < array.length; index++) {
                    await callback(array[index], index, array);
                }
            }

            const getCastleEntry = async () => {
                try {
                    return await axios.get('http://castles.poulpi.fr/castles/1/rooms/entry');
                }
                catch (err) {
                    console.log(`getCastleEntry exception: ${err}`);
                }
            }

            const getChestStatus = async (chestUri) => {
                try {
                    return await axios.get(`http://castles.poulpi.fr${chestUri}`);
                }
                catch (err) {
                    console.log(`getChestStatus exception: ${err}`);
                }
            }

            const getFullChestsCount = async (roomUri, fulleChestsResult) => {
                try {
                    const roomDetails = await axios.get(`http://castles.poulpi.fr${roomUri}`);

                    const chests = roomDetails.data.chests;

                    await asyncForEach(chests, async (chest) => {
                        const chestDetails = await getChestStatus(chest);
                        if (chestDetails.data.status !== 'This chest is empty :/ Try another one!') {
                            fulleChestsResult.links.push(chest);
                        }
                    });

                    var rooms = roomDetails.data.rooms;
                    console.log(`Parent Room: ${roomUri}`);
                    console.log(`Current Result: ${fulleChestsResult.links.length}`);
                    console.log("\n\n");

                    await asyncForEach(rooms, async (room) => {
                        fulleChestsResult = await getFullChestsCount(room, fulleChestsResult);
                    });

                    return fulleChestsResult;
                }
                catch (err) {
                    console.error(err);
                }
            }

            console.time("ExecutionDuration");

            const fulleChestsResult = {
                links: []
            };

            const castleEntry = await getCastleEntry();

            const rooms = castleEntry.data.rooms;
            const chests = castleEntry.data.chests;

            await asyncForEach(chests, async (chest) => {
                const chestDetails = await getChestStatus(chest);

                if (chestDetails.data.status !== 'This chest is empty :/ Try another one!') {
                    fulleChestsResult.links.push(chest);
                }
            });

            await asyncForEach(rooms, async (room) => {
                fulleChestsResult = await getFullChestsCount(room, fulleChestsResult);
            });

            console.log(`Final result: ${JSON.stringify(fulleChestsResult, null, 1)}`);
            console.timeEnd("ExecutionDuration");
            return fulleChestsResult;
        });

        return result;

    } catch (err) {
        console.error(err);
    } finally {
        // stop the worker pool
        await stop();
    }
}

(async () => console.log(await execute()))();