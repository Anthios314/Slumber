class Countdown {
    constructor(name, ID, time, reward) {
        this.name = name;
        this.id = ID;
        this.timeMax = time; //in ms
        this.timeLeft = time;
        this.reward = reward;
        this.running = false; //might need to fix this in data. Somehow. 
    }
    get timeLevel() {
        return player.tranProducers.intLevel[this.id];
    }
    set timeLevel(level) {
        player.tranProducers.intLevel[this.id] = level;
    }
    get timeCost() {
        return Decimal.pow(3, this.id + 1).times(Decimal.pow(2, this.timeLevel));
    }

    get payLevel() {
        return player.tranProducers.payout[this.id];
    }
    set payLevel(level) {
        player.tranProducers.payout[this.id] = level;
    }
    get payCost() {
        return Decimal.pow(3, this.id + 1).times(Decimal.pow(2, this.payLevel));
    }

    get timeStep() {
        return 1000 * Math.pow(1.25, this.timeLevel);
    }
    get timeLeft() {
        return player.tranProducers.timeLeft[this.id];
    }
    set timeLeft(time) {
        player.tranProducers.timeLeft[this.id] = time;
    }
    stepTime(diff) { //diff is the number of ms since last tick
        if (!this.running) {
            this.timeLeft = this.timeMax; //failsafe
            return;
        }
        this.timeLeft -= this.timeStep * (diff / 1000);
        if (this.timeLeft <= 0) {
            this.running = false;
            this.timeLeft = this.timeMax;
            player.tran = player.tran.add(this.reward * (1 + this.payLevel));
        }
    }
    start() {
        if (this.running) {
            this.running = false;
            return;
        }
        let anyRunning = false
        for (let i in prod) {
            anyRunning = (anyRunning || prod[i].running);
        }
        if (anyRunning) return;
        this.running = true;
    }
    getTimeLeft() {
        return Math.round(1000 * this.timeLeft / this.timeStep);
    }
    getInvervalCost() {
        return Decimal.pow(5, this.id + 1)
    }
}
function setupProduction() {
    prod = [
        new Countdown("Tidy up the bookshelves", 0, 3000, 1),
        new Countdown("Mop the floor", 1, 15000, 5),
        new Countdown("Mow the lawn", 2, 60000, 25), 
        new Countdown("Develop the game", 3, 99999999, 0) //I dunno tbh. 
    ];
}
function doTask(taskID) {
    prod[taskID].start();
}

function updateProduction(diff) {
    for (let i in prod) {
        prod[i].stepTime(diff);
    }
}

function showProduction() {
    let item;
    for (let i in prod) {
        item = prod[i];
        getEl("producer" + i).innerHTML = item.name + "<br> for " + (item.reward * (1 + item.payLevel)) + " tranquility <br>"+ toCTime(item.getTimeLeft()) + " remaining";
    }
}

function updateProductionProgress() {
    let item;
    for (let i in prod) {
        item = prod[i];
        if (!item.running) {
            getEl("prodBar" + i).style.width = "0px"
        } else {
            getEl("prodBar" + i).style.width = ((1 - (item.timeLeft / item.timeMax)) * (4+getEl("producer" + i).clientWidth)) + "px"
        }
    }
}

function upgTranInterval(ID) {
    const item = prod[ID];
    if (item.timeCost.gt(player.tran)) return;
    player.tran = player.tran.minus(item.timeCost);
    item.timeLevel = item.timeLevel + 1;
    checkTranStatus();
}

function upgTranPay(ID) {
    const item = prod[ID];
    if (item.payCost.gt(player.tran)) return;
    player.tran = player.tran.minus(item.payCost);
    item.payLevel = item.payLevel + 1;
    checkTranStatus();
}

function updateTranCosts() {
    for (let i in prod) {
        item = prod[i]
        getEl("timeCost" + i).innerHTML = "Decrease Interval for " + item.timeCost + " tranquility"
        getEl("payCost" + i).innerHTML = "Increase gain for " + item.payCost + " tranquility"
    }
}

function checkTranStatus() {
    for (let i=0; i<3; i++) {
        console.log(`${i}: ${prod[i].timeLevel}`)
        if (prod[i].timeLevel > 0 || prod[i].payLevel > 0) {
            getEl("tile" + (i+1)).style = "visibility: visibile";
        } else {
            getEl("tile" + (i+1)).style = "visibility: hidden";
        }
    }
}



function updateTranquility() {
    getEl("tranquility").innerHTML = player.tran;
}


function hasRested() {
    return player.resets.sleep > 0;
}
//--------------------------------------------------------------------------------------------
class Upgrade {
    constructor(name, desc, effect, cost, ID) {
        this.name = name;
        this.desc = desc;
        this.effect = effect;
        this.cost = cost;
        this.enabled = true; //keeping this for later
        const upg = this;
        Object.defineProperty(upg, "bought", {
            get() {
              return player.upgs[ID]
            },
            set(x) {
              player.upgs[ID] = x
            }
        })
    }
    canAfford() {
        return (player.dual.gte(this.cost))
    }
    buy() {
        if (!this.canAfford() || this.bought) return false
        player.dual.minus(this.cost)
        this.bought = true
    }
}

class Repeatable extends Upgrade { 
    constructor(name, desc, effect, cost, ID, maxLvl) {
        super(name, desc, effect, cost, ID)
        const upg = this;
        this.max = maxLvl
        Object.defineProperty(upg, "cost", {
          get() {
            return cost.bind(upg)()
          }
        })
    }
    maxxed() {
        return (this.bought >= this.max)
    }
    buy() {
        if (!this.canAfford() || this.maxxed()) return false
        player.dual.minus(this.cost)
        this.bought++
    }
}

const upgrades = {
    u11: new Repeatable("Focus", "Increase tranquility gain", () => D(player.upgs[0] + 1), () => Decimal.pow(2, player.upgs[0]), 0, 10),
    u12: new Repeatable("Determination", "Tasks run for longer", () => Decimal.pow(2,player.upgs[1]), () => Decimal.pow(10, player.upgs[1]), 1, 7),
    u13: new Repeatable("Understanding", "Increase Knowledge gain", () => D(player.upgs[2] + 1), () => Decimal.pow(player.upgs[2]+1, 4), 2, 9),
    u14: new Repeatable("Restfulness", "Increase tranquility gain based on time since last rest", () => Math.min(30 * Math.pow(0.4, player.upgs[3]), 0.05), () => (10 * Decimal.pow(5, player.upgs[3])), 3, 7),

    u21: new Upgrade("Cleanliness", "Unlock a new task", null, 1, 4),
    u22: new Upgrade("Recollection", "Boost <1st task> based on time slept", () => Math.sqrt(player.reset.sleepTime), 1, 5)
}

const dUSizes = {x: 4, y:2}
function drawDualityTable(reset = false) { //random garbage for drawing a table, do NOT call this function.
    var table = document.getElementById("upgs")
    for (let r = 1; r <= dUSizes.y; r++) {
        let row = table.insertRow(r - 1)
        for (let c = 1; c <= dUSizes.x; c++) {
            var col = row.insertCell(c - 1)
            var id = (r * 10 + c)
            col.innerHTML = "<button id='pu" + id + "' class='infinistorebtn1' onclick='buyPU("+id+","+(r<2)+")'>"+(typeof(puDescs[id])=="function"?"<span id='pud"+id+"'></span>":puDescs[id]||"???")+(puMults[id]?"<br>Currently: <span id='pue"+id+"'></span>":"")+"<br><span id='puc"+id+"'></span></button>"
        }
    }
}


const testVar = new Upgrade("I can do itttt", Decimal.pow(2,87865), D(50))



/*class Command {
    constructor(number, name, desc, message, anyChannel) {
        this.number = number;
        this.name = name;
        this.description = desc;
        this.message = message
        this.anyChannel = anyChannel
    }
    execute(message) {
        if (this.anyChannel || functions.botCommandsCheck(message.channel.id, message)) message.channel.send(this.message)
        else message.channel.send("This is a miscellaneous command and is only allowed in <#351479640755404820>")
    }
}

class Progression extends Command {
    constructor (number, name, desc, message, channels, messageFail = "This is a miscellaneous command and is only allowed in <#351479640755404820>") {
        super(number, name, desc, message, false);
        this.channels = channels; //so, like, functions.botCommandsCheck, without parenthesis
        this.wrongChannel = messageFail;
    };
    execute(message) {
        if (this.channels()) message.channel.send(this.message);
        else message.channel.send(this.wrongChannel);
    }
}*/
