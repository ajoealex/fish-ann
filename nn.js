const sigmoid = x => 1 / (1 + Math.exp(-x));
const dSigmoid = y => y * (1 - y);

class NeuralNetwork {
  constructor(i,h,o,lr=0.3){
    this.i=i; this.h=h; this.o=o; this.lr=lr;
    this.wih=this.rand(h,i); this.who=this.rand(o,h);
    this.bh=this.rand(h,1); this.bo=this.rand(o,1);
  }
  rand(r,c){ return Array.from({length:r},()=>Array.from({length:c},()=>Math.random()*2-1)); }
  static dot(a,b){
    const res = Array.from({length:a.length},()=>Array(b[0].length).fill(0));
    for(let i=0;i<a.length;i++)for(let j=0;j<b[0].length;j++)for(let k=0;k<b.length;k++)res[i][j]+=a[i][k]*b[k][j];
    return res;
  }
  static add(a,b){ return a.map((r,i)=>r.map((v,j)=>v+b[i][j])); }
  static sub(a,b){ return a.map((r,i)=>r.map((v,j)=>v-b[i][j])); }
  static map(m,f){ return m.map(r=>r.map(f)); }
  static T(m){ return m[0].map((_,i)=>m.map(r=>r[i])); }
  static toM(a){ return a.map(v=>[v]); }

  feedForward(input){
    const inp = NeuralNetwork.toM(input);
    let h = NeuralNetwork.add(NeuralNetwork.dot(this.wih,inp),this.bh);
    h = NeuralNetwork.map(h,sigmoid);
    let o = NeuralNetwork.add(NeuralNetwork.dot(this.who,h),this.bo);
    o = NeuralNetwork.map(o,sigmoid);
    return o;
  }

  train(input,target){
    const inputs = NeuralNetwork.toM(input);
    const h = NeuralNetwork.map(NeuralNetwork.add(NeuralNetwork.dot(this.wih,inputs),this.bh),sigmoid);
    const o = NeuralNetwork.map(NeuralNetwork.add(NeuralNetwork.dot(this.who,h),this.bo),sigmoid);
    const targets = NeuralNetwork.toM(target);
    const err = NeuralNetwork.sub(targets,o);

    let grad = NeuralNetwork.map(o,dSigmoid);
    grad = grad.map((r,i)=>r.map((v,j)=>v*err[i][j]*this.lr));
    const whoD = NeuralNetwork.dot(grad,NeuralNetwork.T(h));
    this.who = NeuralNetwork.add(this.who,whoD);
    this.bo  = NeuralNetwork.add(this.bo,grad);

    const hErr = NeuralNetwork.dot(NeuralNetwork.T(this.who),err);
    let hGrad = NeuralNetwork.map(h,dSigmoid);
    hGrad = hGrad.map((r,i)=>r.map((v,j)=>v*hErr[i][j]*this.lr));
    const wihD = NeuralNetwork.dot(hGrad,NeuralNetwork.T(inputs));
    this.wih = NeuralNetwork.add(this.wih,wihD);
    this.bh  = NeuralNetwork.add(this.bh,hGrad);
  }
}
