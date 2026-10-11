function t1(){const shared=9;return shared}            // red: ท้องถิ่น ห้ามนับ
function t2(){return realFn()}                          // ต้องนับ: เรียกฟังก์ชันของ A
function t3(){if(1){var viaVarHoist=1}return viaVarHoist} // var ยกขึ้น ห้ามนับ
function t4(){{let viaLetBlock=1}return viaLetBlock}     // let ในบล็อก ใช้นอกบล็อก ต้องนับ
function t5(viaParam){return viaParam}                   // พารามิเตอร์ ห้ามนับ
function t6({viaDestr}){return viaDestr}                 // destructuring ห้ามนับ
function t7(){try{}catch(viaCatch){return viaCatch}}     // catch ห้ามนับ
const t8=function viaFnExpr(){return viaFnExpr};         // ชื่อ function expression ห้ามนับ
function t9(){for(const viaFor of [1])return viaFor}     // for-of ห้ามนับ
function t10(){function viaInner(){}return viaInner}     // ฟังก์ชันภายใน ห้ามนับ
function t11(){return keepReal+1}                        // ต้องนับ: อ้างชื่อบนสุดจริงในฟังก์ชัน
const t12=(blockOnly)=>blockOnly;                        // พารามิเตอร์ arrow ห้ามนับ
