(function(root){
  'use strict';
  function mount(E,slug,start){
    const $=id=>document.getElementById(id);if(!E.procedural?.supported.includes(slug))return null;
    $('generatedSection').hidden=false;$('generatedNumber').value='1';$('generatedDifficulty').value='3';
    function report(error){$('generatedMessage').textContent=error.message;const status=$('status');if(status)status.textContent=error.message;const dialog=$('result')||$('resultDialog');if(dialog?.open){const message=$('resultText')||$('resultMessage');if(message)message.textContent=error.message;}}
    function open(number,difficulty,version=1){try{const state=E.generate(slug,number,difficulty,version);$('generatedMessage').textContent='';start(state);return state;}catch(error){report(error);return null;}}
    const chosen=()=>open($('generatedNumber').value.trim(),Number($('generatedDifficulty').value));
    $('generatedStart').onclick=chosen;$('generatedForm').onsubmit=event=>{event.preventDefault();chosen();};$('generatedAfterCampaign').onclick=chosen;
    return{
      open,
      next(state){try{return open(E.procedural.nextNumber(state._generated.number),state._generated.difficulty,state._generated.version);}catch(error){report(error);return null;}},
      sync(state){$('generatedAfterCampaign').hidden=!!state._generated||state.level!==7||!state.won;if(state._generated){$('generatedNumber').value=state._generated.number;$('generatedDifficulty').value=String(state._generated.difficulty);}},
    };
  }
  root.MiniProcedural={mount};
}(window));
