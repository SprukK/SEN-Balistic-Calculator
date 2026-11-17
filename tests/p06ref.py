# Reproduce: python3 p06ref.py  → reference velocities used by readtest.js (P-06). No app code involved.
# Independent §20A reproduction for P-06: point-mass, G7 (skill §6A table), moist air (skill §5A), drag (π/8)ρv²Cd/BC_SI (skill §6C).
import math, json
G7=[(0.00,0.1198),(0.05,0.1197),(0.10,0.1196),(0.15,0.1194),(0.20,0.1193),(0.25,0.1194),(0.30,0.1194),(0.35,0.1194),(0.40,0.1193),(0.45,0.1193),
 (0.50,0.1194),(0.55,0.1193),(0.60,0.1194),(0.65,0.1197),(0.70,0.1202),(0.725,0.1207),(0.75,0.1215),(0.775,0.1226),(0.80,0.1242),(0.825,0.1266),
 (0.85,0.1306),(0.875,0.1368),(0.90,0.1464),(0.925,0.1660),(0.95,0.2054),(0.975,0.2993),(1.00,0.3803)]
def cd(m):
    for (a,ca),(b,cb) in zip(G7,G7[1:]):
        if a<=m<=b: return ca+(cb-ca)*(m-a)/(b-a)
    raise ValueError(m)
def rho(t,p,rh):
    T=t+273.15;P=p*100;es=6.1078*10**(7.5*t/(237.3+t))*100;e=rh/100*es
    return (P-e)/(287.058*T)+e/(461.495*T)
sos=lambda t:(1.4*287.058*(t+273.15))**0.5
station=lambda q,h:q*(1-2.25577e-5*h)**5.25588
R=rho(20,station(1010,298),65);A=sos(20);BC=0.128*703.07;g=9.80665
def acc(vx,vy):
    v=math.hypot(vx,vy);a=math.pi/8*R*v*v*cd(v/A)/BC
    return -a*vx/v,-a*vy/v-g
def vel_at(d,mv=280.0,dt=2e-6):
    x=y=0.0;vx,vy=mv,0.0
    while True:
        def f(s):vx_,vy_=s[2],s[3];ax,ay=acc(vx_,vy_);return(vx_,vy_,ax,ay)
        s=(x,y,vx,vy);k1=f(s);k2=f(tuple(s[i]+dt/2*k1[i] for i in range(4)));k3=f(tuple(s[i]+dt/2*k2[i] for i in range(4)));k4=f(tuple(s[i]+dt*k3[i] for i in range(4)))
        n=tuple(s[i]+dt/6*(k1[i]+2*k2[i]+2*k3[i]+k4[i]) for i in range(4))
        if n[0]>=d:  # interpolate to exactly d
            f_=(d-x)/(n[0]-x);return math.hypot(vx+(n[2]-vx)*f_,vy+(n[3]-vy)*f_)
        x,y,vx,vy=n
out={'rho':R,'aS':A,'v':{str(d):vel_at(d) for d in [12.5,18.3,22.86,27.43,45.72,100]}}
print(json.dumps(out))
