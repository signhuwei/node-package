let fs = require('fs')
let path = require('path')
let zlib = require('zlib')
modules.exports = {
async pack(folder,pack,zip){
        function eachFile(fd,rd,fjson={}){
            fjson[rd] = -1;
            let files = fs.readdirSync(fd);
            for(let file of files){
                let filePath = path.join(fd,file);
                let stat = fs.statSync(filePath);
                let k = path.join(rd,file);
                if(stat.isDirectory()) eachFile(filePath,k,fjson);
                if(stat.isFile()) fjson[k] = stat.size;
            }
            return fjson;
        }
        let basename = path.basename(folder);
        let dirname = path.dirname(folder);
        let filesInfo = eachFile(folder,basename);
    
        let headString = JSON.stringify(filesInfo);
        let size = headString.length;
        let buff = Buffer.alloc(57 + size,' ');
        buff.write(size.toString());
        buff.write(headString,57);
        fs.writeFileSync(pack,buff);
        for(let f in filesInfo){
            if(filesInfo[f] > 0)
                await new Promise((res,rej)=>{ fs.createReadStream(path.join(dirname,f)).pipe(fs.createWriteStream(pack,{flags:'a'}).on('finish',res).on('error',rej))})
        }
        if(zip)
            await new Promise((res,rej)=>{fs.createReadStream(pack).pipe(zlib.createGzip()).pipe(fs.createWriteStream(pack+'.gz').on('finish',res).on('error',rej))});
    },
    async unpack(p,d,z=true){
        fs.existsSync(d) || fs.mkdirSync(d);
        z ? await new Promise((res,rej)=>{ fs.createReadStream(p).pipe(zlib.createGunzip()).pipe(fs.createWriteStream(p+='.guz').on('finish',res).on('error',rej))})
         : await new Promise((res,rej)=>{ fs.createReadStream(p).pipe(fs.createWriteStream(p+='.guz').on('finish',res).on('error',rej))});
        let fd = fs.openSync(p,'r');
        function rb(s){ let r = Buffer.alloc(s);fs.readSync(fd,r,0,s);return r;}
        let s = parseInt(rb(57));
        let h = JSON.parse(rb(s).toString());
        for(let f in h){
            let fp = path.join(d,f);
            h[f] == -1 ? (fs.existsSync(fp) || fs.mkdirSync(fp)) : fs.writeFileSync(fp,rb(h[f]));
        }
        fs.closeSync(fd);
    }
}
