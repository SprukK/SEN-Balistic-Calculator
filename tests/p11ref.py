# Reproduce: python3 p11ref.py  → reference BCs used by warntest.js (P-11). No app code involved.
# Independent §20A reproduction for P-11 (velocity-truing sensitivity): the p06ref.py point-mass (G7, moist air,
# (π/8)ρv²Cd/BC_SI), BC 0.128, 60 gr, 280 m/s, Everyday Default; V at 23 m from the model, then the BC that
# gives V₂₃ ± δ and V₀ ± δ (bisection on BC with the same integrator). Level fire, launch-angle effect < 0.001 m/s.
import math, json
G7=[(0.00,0.1198),(0.05,0.1197),(0.10,0.1196),(0.15,0.1194),(0.20,0.1193),(0.25,0.1194),(0.30,0.1194),(0.35,0.1194),(0.40,0.1193),(0.45,0.1193),
 (0.50,0.1194),(0.55,0.1193),(0.60,0.1194),(0.65,0.1197),(0.70,0.1202),(0.725,0.1207),(0.75,0.1215),(0.775,0.1226),(0.80,0.1242),(0.825,0.1266),
 (0.85,0.1306),(0.875,0.1368),(0.90,0.1464)]
def cd(m):
    for (a,ca),(b,cb) in zip(G7,G7[1:]):
        if a<=m<=b: return ca+(cb-ca)*(m-a)/(b-a)
    raise ValueError(m)
def rho(t,p,rh):
    T=t+273.15;P=p*100;es=6.1078*10**(7.5*t/(237.3+t))*100;e=rh/100*es
    return (P-e)/(287.058*T)+e/(461.495*T)
sos=lambda t:(1.4*287.058*(t+273.15))**0.5
station=lambda q,h:q*(1-2.25577e-5*h)**5.25588
R=rho(20,station(1010,298),65);A=sos(20)
def vel_at(d,mv,bc,dt=1e-5):   # 1-D along the bore is enough at 23 m (gravity changes |v| by < 1e-4 m/s)
    x,v=0.0,mv;k=math.pi/8*R/(bc*703.07)
    f=lambda v:-k*v*v*cd(v/A)
    while True:
        k1=f(v);k2=f(v+dt/2*k1);k3=f(v+dt/2*k2);k4=f(v+dt*k3)
        vn=v+dt/6*(k1+2*k2+2*k3+k4)
        # position by RK4 on dx/dt=v (stage velocities)
        xn=x+dt/6*(v+2*(v+dt/2*k1)+2*(v+dt/2*k2)+(v+dt*k3))
        if xn>=d: return v+(vn-v)*(d-x)/(xn-x)
        x,v=xn,vn
def bc_for(mv,d,vd):
    lo,hi=0.02,1.0
    for _ in range(45):
        m=(lo+hi)/2
        if vel_at(d,mv,m)<vd: lo=m
        else: hi=m
    return (lo+hi)/2
D=23.0;V23=vel_at(D,280.0,0.128)
out={'V23':V23,'vd':{str(dv):bc_for(280.0,D,V23+dv) for dv in (-1,-0.3,0.3,1)},'v0':{str(dv):bc_for(280.0+dv,D,V23) for dv in (-1,-0.3,0.3,1)}}
print(json.dumps(out))
