"use strict";

////////////////////////////////
//----------------------------//
// Copyright (c) 2018 NullDev //
//----------------------------//
////////////////////////////////

let fs        = require("fs");
let prompt    = require("prompts");
let pArg      = require("minimist")(process.argv.slice(2));;
let term      = require("terminal-kit").terminal;

let log       = require("./utils/logger");
let Scrambler = require("./utils/scrambler");
let pj        = require("./package.json");

term.clear();

console.log(
    "\n" +
    "  #####################\n" +
    "  #-------------------#\n" +
    "  # NodeScrambler2001 #\n" +
    "  # v" + pj.version + "            #\n" +
    "  #-------------------#\n" +
    "  #####################\n"
);

log("Copyright (c) " + (new Date()).getFullYear() + " NullDev\n");

let isset = function(obj){ 
    return !!(obj && obj !== null && (typeof obj === 'string' || typeof obj === 'number' && obj !== "") || obj === 0); 
};

function getRand(){
    let base = require("./data/alphabet")[0];
    let shuffled = "";
    base = base.split("");
    while (base.length > 0) shuffled +=  base.splice(base.length * Math.random() << 0, 1);
    return shuffled;
}

//This is where shit goes downhill

let init = async function(callback){
    let splash = require("./data/splash");
    log(splash[Math.floor(Math.random() * splash.length)] + "\n");

    let res = await prompt([{
        type: "text",
        name: "msgtxt",
        message: "Message"
    },{
        type: "text",
        name: "keytxt",
        message: "Key (optional)"
    },{
        type: "number",
        name: "ishift",
        message: "Initial Shift"
    },{
        type: "number",
        name: "vshift",
        message: "Shift Value"
    }]);

    function promptMode(){
        term.singleLineMenu(["Encrypt", "Decrypt"], { selectedStyle: term.dim.blue.bgCyan }, function(err, call){
            if (err) return log(err, true);
            res["decrypt"] = call.selectedIndex;

            second(res);
        });
        
        function second(res){
            console.log("\n");
            log("Do you want to output the result as Base64?");

            term.singleLineMenu(["No", "Yes"], { selectedStyle: term.dim.blue.bgCyan }, function(err, call){
                if (err) return log(err, true);
                res["b64"] = call.selectedIndex;
                return callback(res);
            });
        }
    }

    if(/^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/.test(res.msgtxt)){
        console.log();
        log("Hold on! Your message appears to be in base64. Is that correct?");
        term.singleLineMenu(["Yes", "No"], { selectedStyle: term.dim.blue.bgCyan }, function(err, call){
            if (err) return log(err, true);
            if (call.selectedIndex == 0){
                console.log("\n");
                res.msgtxt = Buffer.from(res.msgtxt, "base64").toString("ascii");
                log("The decoded message is: " + res.msgtxt);
            }
            console.log();
            promptMode();
        });
    }

    else promptMode();
};

let main = function(res){
    console.log("\n");

    if (!isset(res.msgtxt)) return log("Oof... You didn't give me a text!", true);
    
    if (!isset(res.ishift)){
        res.ishift = 0;
        log("Initial shift wasn't specified. It has been set to: 0\n");
    }
    
    if (!isset(res.vshift)){
        res.vshift = 1;
        log("Shift Value wasn't specified. It has been set to: 1\n");
    }

    if (!isset(res.keytxt)){
        let newKey = getRand();
        res.keytxt = newKey;
        log("You haven't provided a key!");
        log("Therefore it has been set to: \"" + newKey + "\"");
    }

    let scrambler = new Scrambler(res.ishift, res.vshift, res.keytxt);

    scrambler.addOffset(res.vshift);

    let result = res.decrypt ? scrambler.decrypt(res.msgtxt) : scrambler.encrypt(res.msgtxt);

    result = res.b64 == 1 ? Buffer.from(result).toString("base64") : result;

    console.log();
    log("Result: " + result);
};

let start = function(){
    let args = process.argv.slice(2);
    let verbose = false;

    function verb(text){ if (verbose) log(text); }

    if (args.length == 0){
        init(function(res){ 
            main(res); 
            end();
        });
    }

    else {
        let res = {};

        if (("v" in pArg) || ("verbose" in pArg)) verbose = true;

        verb("Running in CLI mode (verbose)...\n");
        
        if (("h" in pArg) || ("help" in pArg)) return log(
            "Help:\n\n" +
            " |==============|=======|=================================|==========|=========|\n" +
            " | Argument     | Alias | Description                     | Required | Default |\n" +
            " | ------------ | ----- | ------------------------------- | -------- | ------- |\n" +
            " | --help       | -h    | Displays the help menu          | No       | N/A     |\n" +
            " | --message    | -m    | The message to en-/decrypt      | Yes      | N/A     |\n" +
            " | --decrypt    | -d    | Decrypt the message             | Yes      | N/A     |\n" +
            " | --encrypt    | -e    | Encrypt the message             | Yes      | N/A     |\n" +
            " | --initshift  | -i    | Initial Cipher Shift            | No       | 0       |\n" +
            " | --shiftvalue | -s    | Cipher Shift Value              | No       | 1       |\n" +
            " | --base64     | -b    | Output as Base64                | No       | False   |\n" +
            " | --is-base64  | -n    | Whether the input is in base64  | No       | False   |\n" +
            " | --key        | -k    | The Key                         | No       | Random  |\n" +
            " | --verbose    | -v    | Display additional informations | No       | False   |\n" +
            " | ------------ | ----- | ------------------------------- | -------- | ------- |\n" +
            " |=============================================================================|\n"
        );

        if (!isset(pArg.m) && !isset(pArg.message)) return log("Please specify a message.\n", true);

        res.msgtxt = pArg.m || pArg.message;
        if (isset(res.msgtxt)) verb("Message has been set to: " + res.msgtxt + "\n");

        if (!("d" in pArg) && !("decrypt" in pArg) && !("e" in pArg) && !("encrypt" in pArg)) return log(
            "Please specify whether to encrypt or decrypt the message.\n", 
            true
        );

        if ((("d" in pArg) || ("decrypt" in pArg)) && (("e" in pArg) || ("encrypt" in pArg))) return log(
            "Please choose ONE mode only.\n", 
            true
        );

        res.decrypt = (("d" in pArg) || ("decrypt" in pArg)) ? 1 : 0;
        verb("Mode has been set to: " + (res.decrypt == 1 ? "Decrypt" : "Encrypt") + "\n");

        res.keytxt = pArg.k || pArg.key;
        if (isset(res.keytxt)) verb("Key has been set to: " + res.keytxt + "\n");

        res.ishift = pArg.i;
        if (res.ishift === false) res.ishift = pArg.initshift;
        if (isset(res.ishift)) verb("Initial Shift has been set to: " + res.ishift + "\n");

        res.vshift = pArg.s;
        if (res.vshift === false) res.vshift = pArg.shiftvalue;
        if (isset(res.vshift)) verb("Shift Value has been set to: " + res.vshift + "\n");

        res.isbase = pArg.n || pArg["is-base64"];
        verb("Input message is " + (res.isbase ? "" : "not ") + "base64\n");

        res.b64 = pArg.b || pArg.base64;
        verb("Result will " + (res.b64 ? "" : "not ") + "be printed as Base64\n");

        if (res.isbase){
            res.msgtxt = Buffer.from(res.msgtxt, "base64").toString("ascii");
            verb("Decoded Base64 input message is '" + res.msgtxt + "'");
        }

        main(res);
        end();
    }
};

function end(){
    //Cleanups
    console.log();
    process.exit(0);
}

start();
