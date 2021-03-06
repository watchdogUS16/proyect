var speedTest = require('./node_modules/speedtest-net/');
var dweetClient = require('./node_modules/node-dweetio/');
var shell = require('./node_modules/shelljs');
var dngl = require("dngl");
var dblite = require('./node_modules/dblite');

db = dblite('/home/project/dbReports.sqlite');
var dweetio = new dweetClient();
var device = new dngl("/dev/ttyUSB2");
var datos;
var temp = shell.exec("/opt/vc/bin/vcgencmd measure_temp");
var ramT = shell.exec("egrep --color 'MemTotal' /proc/meminfo | egrep '[0-9.]{4,}'");
var ramF = shell.exec("egrep --color 'MemFree' /proc/meminfo | egrep '[0-9.]{4,}'");
var cpu = shell.exec("top -d 0.5 -b -n2 | grep 'Cpu(s)'|tail -n 1 | awk '{print $2 + $4}'");
var ps = shell.exec("ps -a");
var codError = 0;
var now = new Date();

		shell.exec("sudo route add 10.64.64.64 ppp0");
		shell.exec("sudo route add default gw 10.64.64.64 ppp0");

		test = speedTest({maxTime: 5000});
		test.once('data', function(data) {

			datos = data;
			datos1 = jsonConcat({"error":[{"error":" "}]},datos);
			var jsonDate = now.toJSON();
			datos1 = jsonConcat({"currentDate":[{"date":jsonDate}]},datos1);
			device.once('data', function(data){
				codreboot(db);
				shell.exec("sudo route del default gw 10.64.64.64 ppp0");
				shell.exec("sudo route del 10.64.64.64");
				dweetio.dweet_for("watchdog16", {some:jsonConcat(datos1,data)}, function(err, dweet){

				if(!err){

					console.log("Test Realizado");
					insertBD(jsonConcat(datos1,data),db,codError);
					shell.exec("sleep 5")
					shell.exec("killall node");

				}else{

					console.log("Datos no Enviados");
					codError = 1;
					insertBD(null,db,codError);
					shell.exec("sleep 5");
					envioError(codError);

				}
				});
			});

		});

		test.on('error', function(err){

			console.log("Error en test");
			shell.exec("sleep 5");
			codError = 2;
			envioError(codError);

		});

		device.on("error", function(err){
			codError = 3;
      console.log("Error en device");
			shell.exec("sleep 5");
			envioError(codError);

		});


function concat(o1,o2,o3,o4,o5){

	o4 = "CpuUsed: "+o4+"% ";
	o5 = "Ps: "+o5;

	return (o1+o2+o3+o4+o5).replace(/\n/gi," ");

}

function jsonConcat(o1, o2) {

 for (var key in o2) {

  o1[key] = o2[key];

 }

 return o1;

}

function cut(temp,n,m){

return temp.substring(n,m);

}

function envioError(error){

	insertBD(null,db,error);
	datos = {"error":[{"error":error}]};
	var now = new Date();
  var jsonDate = now.toJSON();
	datos1 = jsonConcat({"currentDate":[{"date":jsonDate}]},datos);
	dweetio.dweet_for("watchdog16", {some:datos1}, function(err, dweet){});
	console.log("Datos error enviados");

	}

function insertBD(json, db, cod){
		if(cod==0){

			db.query('INSERT INTO Report VALUES(null,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [now,cod,concat(temp,ramT,ramF,cpu,ps), json.imsi, json.imei, json.speeds.download, json.speeds.upload, json.service.operator, json.service.mode, json.time, json.cell.stat, json.cell.lac, json.cell.cell, json.signal]);

	}else{

			db.query('INSERT INTO Report VALUES(null,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [now,cod,concat(temp,ramT,ramF,cpu,ps),null,null,null,null,null,null,null,null,null,null,null,null]);

		}
	}

function codreboot(db){

	db.query('SELECT * FROM Report', {
	  idReport: Number,
	  value: JSON.parse,
	  value2: JSON.parse
	}, function (err, rows) {

	 	var record = rows[rows.length-1];
		
			if(record.value2==3){

			db.query('INSERT INTO Report VALUES(null,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [now,-1,concat(temp,ramT,ramF,cpu,ps),null,null,null,null,null,null,null,null,null,null,null,null]);
			console.log("Reboot");
			shell.exec("sleep 5");
			shell.exec("sudo reboot");

		}

	})
}
