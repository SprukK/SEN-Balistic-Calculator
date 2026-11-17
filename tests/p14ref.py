# Reproduce: python3 p14ref.py   (< 1 s) → reference numbers used by runtests.js for P-14 / P-18 (V2.18.1).
# Independent §20A reproduction, no app code: 2-D point mass, RK4, G7 (BRL/McCoy table), moist air (Magnus),
# drag (π/8)ρv²Cd/BC_SI with BC in lb/in² × 703.07 (§9H). Queen 60 gr, G7 0.128, 255 m/s, sight 44 mm, zero 50 m.
# Two-pass zero: zero angle by bisection in ZERO air (0 °C, 979.6 hPa station, 80 %), flight in CURRENT air
# (20 °C, 1010 hPa QNH at 298 m, 65 %). Reports the zero pass's time and ∫x dt to 50 m, the current flight's ∫x dt,
# and the drops. P-14: baked drift = w·(t_zero − 50/v0). P-18: ΔH(d) − ΔH(z)·d/z with ΔH = 2Ω·sin(lat)·∫x dt.
import math, json
G7=[(0.00,0.1198),(0.05,0.1197),(0.10,0.1196),(0.15,0.1194),(0.20,0.1193),(0.25,0.1194),(0.30,0.1194),(0.35,0.1194),(0.40,0.1193),(0.45,0.1193),
 (0.50,0.1194),(0.55,0.1193),(0.60,0.1194),(0.65,0.1197),(0.70,0.1202),(0.725,0.1207),(0.75,0.1215),(0.775,0.1226),(0.80,0.1242),(0.825,0.1266),(0.85,0.1306)]
def cd(m):
    for (a,ca),(b,cb) in zip(G7,G7[1:]):
        if a<=m<=b: return ca+(cb-ca)*(m-a)/(b-a)
    raise ValueError(m)
def rho(t,p,rh):
    T=t+273.15;P=p*100;es=6.1078*10**(7.5*t/(237.3+t))*100;e=rh/100*es
    return (P-e)/(287.058*T)+e/(461.495*T)
sos=lambda t:(1.4*287.058*(t+273.15))**0.5
g=9.80665;MV=255.0;SIGHT=0.044;Z=50.0;BCSI=0.128*703.07;OM=7.292115e-5;LAT=46.05
AIR_Z=(rho(0,979.6,80),sos(0));AIR_C=(rho(20,1010*(1-2.25577e-5*298)**5.25588,65),sos(20))
def deriv(s,air):
    x,y,vx,vy=s;v=math.hypot(vx,vy);k=math.pi/8*air[0]*v*cd(v/air[1])/BCSI
    return (vx,vy,-k*vx,-k*vy-g)
def rk4(s,dt,air):
    a=deriv(s,air);b=deriv(tuple(si+dt/2*ai for si,ai in zip(s,a)),air);c=deriv(tuple(si+dt/2*bi for si,bi in zip(s,b)),air);d=deriv(tuple(si+dt*ci for si,ci in zip(s,c)),air)
    return tuple(si+dt/6*(ai+2*bi+2*ci+di) for si,ai,bi,ci,di in zip(s,a,b,c,d))
def fly(ang,air,to,dt=2e-4,marks=()):
    s=(0.0,-SIGHT,MV*math.cos(ang),MV*math.sin(ang));t=0.0;I=0.0;out={};ms=list(marks)
    while True:
        n=rk4(s,dt,air);
        while ms and n[0]>=ms[0]:   # linear within the step to exactly the mark
            f=(ms[0]-s[0])/(n[0]-s[0]);out[ms[0]]=dict(y=s[1]+f*(n[1]-s[1]),t=t+f*dt,I=I+(s[0]+ms[0])/2*f*dt);ms.pop(0)
        I+=(s[0]+n[0])/2*dt;t+=dt;s=n
        if s[0]>=to and not ms: return out
lo,hi=-0.1,0.1
for _ in range(60):
    m=(lo+hi)/2
    (lo,hi)=(lo,m) if fly(m,AIR_Z,Z,marks=(Z,))[Z]['y']>0 else (m,hi)
za=(lo+hi)/2
zp=fly(za,AIR_Z,Z,marks=(Z,))[Z]
cf=fly(za,AIR_C,300,marks=(50,100,200,300))
dz=2*OM*math.sin(math.radians(LAT))*zp['I']*1000
out={'zeroTof':zp['t'],'lag_ms':(zp['t']-Z/MV)*1000,'baked3_mm':3*(zp['t']-Z/MV)*1000,'zeroXT':zp['I'],
     'drops':{d:cf[d]['y']*1000 for d in (50,100,200,300)},
     'corH':{d:2*OM*math.sin(math.radians(LAT))*cf[d]['I']*1000 for d in (200,300)},
     'corH_fromZero':{d:2*OM*math.sin(math.radians(LAT))*cf[d]['I']*1000-dz*d/Z for d in (200,300)}}
print(json.dumps(out))
