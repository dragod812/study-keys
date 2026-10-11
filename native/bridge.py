"""Private Unix-socket connection between an MCP client and the native host.

No TCP listener, remote access, shell, file-path, or JavaScript execution API.
Only the user owning the 0700 integration directory can connect.
"""
import atexit,json,os,socket,stat,struct,threading,uuid

MAX_PACKET=32*1024*1024
def receive(conn):
    def exact(n):
        data=bytearray()
        while len(data)<n:
            part=conn.recv(n-len(data))
            if not part: raise ConnectionError('Browser bridge disconnected.')
            data.extend(part)
        return data
    n=struct.unpack('!I',exact(4))[0]
    if n>MAX_PACKET: raise ValueError('Bridge message exceeds 32 MB.')
    return json.loads(exact(n))

def transmit(conn,value):
    data=json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()
    if len(data)>MAX_PACKET: raise ValueError('Bridge message exceeds 32 MB.')
    conn.sendall(struct.pack('!I',len(data))+data)

class BrowserBridge:
    def __init__(self,store,send):
        self.send=send;self.pending={};self.lock=threading.Lock();self.closed=False
        directory=store.path('.integration');directory.chmod(0o700)
        self.path=store.path('.integration','bridge-'+str(os.getpid())+'.sock')
        if len(str(self.path).encode())>103: raise ValueError('Library path is too long for a Unix socket.')
        if self.path.exists(): self.path.unlink()
        self.socket=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM)
        self.socket.bind(str(self.path));self.path.chmod(0o600);self.socket.listen(8)
        threading.Thread(target=self.accept,daemon=True).start();atexit.register(self.close)

    def accept(self):
        while not self.closed:
            try: conn,_=self.socket.accept()
            except OSError: return
            threading.Thread(target=self.client,args=(conn,),daemon=True).start()

    def client(self,conn):
        ident=str(uuid.uuid4());entry={'event':threading.Event()}
        with conn:
            conn.settimeout(65)
            try:
                command=receive(conn)
                if not isinstance(command,dict) or len(json.dumps(command).encode())>650000: raise ValueError('Command is invalid or too large; use smaller drawing batches.')
                with self.lock:self.pending[ident]=entry
                self.send({'event':'agent','id':ident,'command':command})
                if not entry['event'].wait(60): raise TimeoutError('Browser did not respond. A write may have completed; retry with the same requestId.')
                transmit(conn,entry['result'])
            except Exception as error:
                try:transmit(conn,{'error':str(error)})
                except OSError:pass
            finally:
                with self.lock:self.pending.pop(ident,None)

    def result(self,message):
        with self.lock:
            entry=self.pending.get(message.get('id'))
            if entry:
                entry['result']={'error':message['error']} if message.get('error') else {'value':message.get('value')}
                entry['event'].set()

    def close(self):
        if self.closed:return
        self.closed=True;self.socket.close()
        try:self.path.unlink()
        except FileNotFoundError:pass

def endpoints(store):
    directory=store.path('.integration');info=directory.stat()
    if info.st_uid!=os.getuid() or info.st_mode&0o077: raise ValueError('Integration directory must be owned by you with permissions 0700. Run setup again.')
    return [p for p in directory.glob('bridge-*.sock') if not p.is_symlink() and stat.S_ISSOCK(p.stat().st_mode) and p.stat().st_uid==os.getuid() and not p.stat().st_mode&0o077]

def call(path,command,timeout=65):
    with socket.socket(socket.AF_UNIX,socket.SOCK_STREAM) as conn:
        conn.settimeout(timeout);conn.connect(str(path));transmit(conn,command);result=receive(conn)
    if result.get('error'): raise ValueError(result['error'])
    return result.get('value')

def dispatch(store,command,browser_id=None):
    candidates=[]
    for path in endpoints(store):
        if browser_id and path.stem!=browser_id:continue
        try:
            info=call(path,{'tool':'bridge_status','arguments':{'url':command.get('arguments',{}).get('url')}},5)
            candidates.append((path,info))
        except (OSError,ValueError):continue
    if not candidates: raise ValueError('No Study Keys browser connected. Enable AI access in extension setup, update the companion, then open a supported page.')
    matches=[p for p,info in candidates if info.get('hasPage')]
    choices=matches or [p for p,_ in candidates]
    if len(choices)>1:raise ValueError('Multiple browsers connected. Set browserId to one of: '+', '.join(p.stem for p in choices))
    return call(choices[0],command)
