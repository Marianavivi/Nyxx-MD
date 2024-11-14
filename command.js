var commands = [];

/**
 * Adds a command to the commands array
 * @param {Object} info - Command information
 * @param {Function} func - Command function
 * @returns {Object} The added command data
 */
function cmd(info, func) {
    try {
        // Validate parameters
        if (!info || typeof info !== 'object') {
            throw new Error('Invalid info object');
        }
        if (typeof func !== 'function') {
            throw new Error('func must be a function');
        }

        var data = info;
        data.function = func;

        // Set default values if not provided
        if (!data.dontAddCommandList) data.dontAddCommandList = false;
        if (!info.desc) info.desc = '';
        if (!data.fromMe) data.fromMe = false;
        if (!info.category) info.category = 'misc';
        if (!info.filename) info.filename = "Not Provided";

        // Add command data to the commands array
        commands.push(data);

        // Log the addition of the command
        console.log(`Command added: ${info.desc}`);

        return data;
    } catch (error) {
        console.error('Error adding command:', error.message);
        return null;
    }
}

module.exports = {
    cmd,
    AddCommand: cmd,
    Function: cmd,
    Module: cmd,
    commands,
};
