/** @constructor
*/
var CatenaryKing = function(){
// Workaround for missing functionality in IE 8 and earlier.
if( Object.create === undefined ) {
	Object.create = function( o ) {
	    function F(){}
	    F.prototype = o;
	    return new F();
	};
}

/*******************************************************************************
 * Thunks.
 */

// Force a thunk (if it is a thunk) until WHNF.
function Fay$$_(thunkish,nocache){
  while (thunkish instanceof Fay$$$) {
    thunkish = thunkish.force(nocache);
  }
  return thunkish;
}

// Apply a function to arguments (see method2 in Fay.hs).
function Fay$$__(){
  var f = arguments[0];
  for (var i = 1, len = arguments.length; i < len; i++) {
    f = (f instanceof Fay$$$? Fay$$_(f) : f)(arguments[i]);
  }
  return f;
}

// Thunk object.
function Fay$$$(value){
  this.forced = false;
  this.value = value;
}

// Force the thunk.
Fay$$$.prototype.force = function(nocache) {
  return nocache ?
    this.value() :
    (this.forced ?
     this.value :
     (this.value = this.value(), this.forced = true, this.value));
};


function Fay$$seq(x) {
  return function(y) {
    Fay$$_(x,false);
    return y;
  }
}

function Fay$$seq$36$uncurried(x,y) {
  Fay$$_(x,false);
  return y;
}

/*******************************************************************************
 * Monad.
 */

function Fay$$Monad(value){
  this.value = value;
}

// This is used directly from Fay, but can be rebound or shadowed. See primOps in Types.hs.
// >>
function Fay$$then(a){
  return function(b){
    return Fay$$bind(a)(function(_){
      return b;
    });
  };
}

// This is used directly from Fay, but can be rebound or shadowed. See primOps in Types.hs.
// >>
function Fay$$then$36$uncurried(a,b){
  return Fay$$bind$36$uncurried(a,function(_){ return b; });
}

// >>=
// This is used directly from Fay, but can be rebound or shadowed. See primOps in Types.hs.
function Fay$$bind(m){
  return function(f){
    return new Fay$$$(function(){
      var monad = Fay$$_(m,true);
      return Fay$$_(f)(monad.value);
    });
  };
}

// >>=
// This is used directly from Fay, but can be rebound or shadowed. See primOps in Types.hs.
function Fay$$bind$36$uncurried(m,f){
  return new Fay$$$(function(){
    var monad = Fay$$_(m,true);
    return Fay$$_(f)(monad.value);
  });
}

// This is used directly from Fay, but can be rebound or shadowed.
function Fay$$$_return(a){
  return new Fay$$Monad(a);
}

// Allow the programmer to access thunk forcing directly.
function Fay$$force(thunk){
  return function(type){
    return new Fay$$$(function(){
      Fay$$_(thunk,type);
      return new Fay$$Monad(Fay$$unit);
    })
  }
}

// This is used directly from Fay, but can be rebound or shadowed.
function Fay$$return$36$uncurried(a){
  return new Fay$$Monad(a);
}

// Unit: ().
var Fay$$unit = null;

/*******************************************************************************
 * Serialization.
 * Fay <-> JS. Should be bijective.
 */

// Serialize a Fay object to JS.
function Fay$$fayToJs(type,fayObj){
  var base = type[0];
  var args = type[1];
  var jsObj;
  if(base == "action") {
    // A nullary monadic action. Should become a nullary JS function.
    // Fay () -> function(){ return ... }
    jsObj = function(){
      return Fay$$fayToJs(args[0],Fay$$_(fayObj,true).value);
    };

  }
  else if(base == "function") {
    // A proper function.
    jsObj = function(){
      var fayFunc = fayObj;
      var return_type = args[args.length-1];
      var len = args.length;
      // If some arguments.
      if (len > 1) {
        // Apply to all the arguments.
        fayFunc = Fay$$_(fayFunc,true);
        // TODO: Perhaps we should throw an error when JS
        // passes more arguments than Haskell accepts.
        for (var i = 0, len = len; i < len - 1 && fayFunc instanceof Function; i++) {
          // Unserialize the JS values to Fay for the Fay callback.
          fayFunc = Fay$$_(fayFunc(Fay$$jsToFay(args[i],arguments[i])),true);
        }
        // Finally, serialize the Fay return value back to JS.
        var return_base = return_type[0];
        var return_args = return_type[1];
        // If it's a monadic return value, get the value instead.
        if(return_base == "action") {
          return Fay$$fayToJs(return_args[0],fayFunc.value);
        }
        // Otherwise just serialize the value direct.
        else {
          return Fay$$fayToJs(return_type,fayFunc);
        }
      } else {
        throw new Error("Nullary function?");
      }
    };

  }
  else if(base == "string") {
    jsObj = Fay$$fayToJs_string(fayObj);
  }
  else if(base == "list") {
    // Serialize Fay list to JavaScript array.
    var arr = [];
    fayObj = Fay$$_(fayObj);
    while(fayObj instanceof Fay$$Cons) {
      arr.push(Fay$$fayToJs(args[0],fayObj.car));
      fayObj = Fay$$_(fayObj.cdr);
    }
    jsObj = arr;

  }
  else if(base == "tuple") {
    // Serialize Fay tuple to JavaScript array.
    var arr = [];
    fayObj = Fay$$_(fayObj);
    var i = 0;
    while(fayObj instanceof Fay$$Cons) {
      arr.push(Fay$$fayToJs(args[i++],fayObj.car));
      fayObj = Fay$$_(fayObj.cdr);
    }
    jsObj = arr;

  }
  else if(base == "defined") {
    fayObj = Fay$$_(fayObj);
    if (fayObj instanceof $_Language$Fay$FFI$Undefined) {
      jsObj = undefined;
    } else {
      jsObj = Fay$$fayToJs(args[0],fayObj.slot1);
    }

  }
  else if(base == "nullable") {
    fayObj = Fay$$_(fayObj);
    if (fayObj instanceof $_Language$Fay$FFI$Null) {
      jsObj = null;
    } else {
      jsObj = Fay$$fayToJs(args[0],fayObj.slot1);
    }

  }
  else if(base == "double" || base == "int" || base == "bool") {
    // Bools are unboxed.
    jsObj = Fay$$_(fayObj);

  }
  else if(base == "ptr" || base == "unknown")
    return fayObj;
  else if(base == "automatic" || base == "user") {
    if(fayObj instanceof Fay$$$)
      fayObj = Fay$$_(fayObj);
    jsObj = Fay$$fayToJsUserDefined(type,fayObj);

  }
  else
    throw new Error("Unhandled Fay->JS translation type: " + base);
  return jsObj;
}

// Specialized serializer for string.
function Fay$$fayToJs_string(fayObj){
  // Serialize Fay string to JavaScript string.
  var str = "";
  fayObj = Fay$$_(fayObj);
  while(fayObj instanceof Fay$$Cons) {
    str += fayObj.car;
    fayObj = Fay$$_(fayObj.cdr);
  }
  return str;
};
function Fay$$jsToFay_string(x){
  return Fay$$list(x)
};

// Special num/bool serializers.
function Fay$$jsToFay_int(x){return x;}
function Fay$$jsToFay_double(x){return x;}
function Fay$$jsToFay_bool(x){return x;}

function Fay$$fayToJs_int(x){return Fay$$_(x);}
function Fay$$fayToJs_double(x){return Fay$$_(x);}
function Fay$$fayToJs_bool(x){return Fay$$_(x);}

// Unserialize an object from JS to Fay.
function Fay$$jsToFay(type,jsObj){
  var base = type[0];
  var args = type[1];
  var fayObj;
  if(base == "action") {
    // Unserialize a "monadic" JavaScript return value into a monadic value.
    fayObj = new Fay$$Monad(Fay$$jsToFay(args[0],jsObj));

  }
  else if(base == "string") {
    // Unserialize a JS string into Fay list (String).
    fayObj = Fay$$list(jsObj);
  }
  else if(base == "list") {
    // Unserialize a JS array into a Fay list ([a]).
    var serializedList = [];
    for (var i = 0, len = jsObj.length; i < len; i++) {
      // Unserialize each JS value into a Fay value, too.
      serializedList.push(Fay$$jsToFay(args[0],jsObj[i]));
    }
    // Pop it all in a Fay list.
    fayObj = Fay$$list(serializedList);

  }
  else if(base == "tuple") {
    // Unserialize a JS array into a Fay tuple ((a,b,c,...)).
    var serializedTuple = [];
    for (var i = 0, len = jsObj.length; i < len; i++) {
      // Unserialize each JS value into a Fay value, too.
      serializedTuple.push(Fay$$jsToFay(args[i],jsObj[i]));
    }
    // Pop it all in a Fay list.
    fayObj = Fay$$list(serializedTuple);

  }
  else if(base == "defined") {
    if (jsObj === undefined) {
      fayObj = new $_Language$Fay$FFI$Undefined();
    } else {
      fayObj = new $_Language$Fay$FFI$Defined(Fay$$jsToFay(args[0],jsObj));
    }

  }
  else if(base == "nullable") {
    if (jsObj === null) {
      fayObj = new $_Language$Fay$FFI$Null();
    } else {
      fayObj = new $_Language$Fay$FFI$Nullable(Fay$$jsToFay(args[0],jsObj));
    }

  }
  else if(base == "int") {
    // Int are unboxed, so there's no forcing to do.
    // But we can do validation that the int has no decimal places.
    // E.g. Math.round(x)!=x? throw "NOT AN INTEGER, GET OUT!"
    fayObj = Math.round(jsObj);
    if(fayObj!==jsObj) throw "Argument " + jsObj + " is not an integer!";

  }
  else if (base == "double" ||
           base == "bool" ||
           base ==  "ptr" ||
           base ==  "unknown") {
    return jsObj;
  }
  else if(base == "automatic" || base == "user") {
    if (jsObj && jsObj['instance']) {
      fayObj = Fay$$jsToFayUserDefined(type,jsObj);
    }
    else
      fayObj = jsObj;

  }
  else { throw new Error("Unhandled JS->Fay translation type: " + base); }
  return fayObj;
}

/*******************************************************************************
 * Lists.
 */

// Cons object.
function Fay$$Cons(car,cdr){
  this.car = car;
  this.cdr = cdr;
}

// Make a list.
function Fay$$list(xs){
  var out = null;
  for(var i=xs.length-1; i>=0;i--)
    out = new Fay$$Cons(xs[i],out);
  return out;
}

// Built-in list cons.
function Fay$$cons(x){
  return function(y){
    return new Fay$$Cons(x,y);
  };
}

// List index.
// `list' is already forced by the time it's passed to this function.
// `list' cannot be null and `index' cannot be out of bounds.
function Fay$$index(index,list){
  for(var i = 0; i < index; i++) {
    list = Fay$$_(list.cdr);
  }
  return list.car;
}

// List length.
// `list' is already forced by the time it's passed to this function.
function Fay$$listLen(list,max){
  for(var i = 0; list !== null && i < max + 1; i++) {
    list = Fay$$_(list.cdr);
  }
  return i == max;
}

/*******************************************************************************
 * Numbers.
 */

// Built-in *.
function Fay$$mult(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) * Fay$$_(y);
    });
  };
}

function Fay$$mult$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) * Fay$$_(y);
  });

}

// Built-in +.
function Fay$$add(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) + Fay$$_(y);
    });
  };
}

// Built-in +.
function Fay$$add$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) + Fay$$_(y);
  });

}

// Built-in -.
function Fay$$sub(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) - Fay$$_(y);
    });
  };
}
// Built-in -.
function Fay$$sub$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) - Fay$$_(y);
  });

}

// Built-in /.
function Fay$$divi(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) / Fay$$_(y);
    });
  };
}

// Built-in /.
function Fay$$divi$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) / Fay$$_(y);
  });

}

/*******************************************************************************
 * Booleans.
 */

// Are two values equal?
function Fay$$equal(lit1, lit2) {
  // Simple case
  lit1 = Fay$$_(lit1);
  lit2 = Fay$$_(lit2);
  if (lit1 === lit2) {
    return true;
  }
  // General case
  if (lit1 instanceof Array) {
    if (lit1.length != lit2.length) return false;
    for (var len = lit1.length, i = 0; i < len; i++) {
      if (!Fay$$equal(lit1[i], lit2[i])) return false;
    }
    return true;
  } else if (lit1 instanceof Fay$$Cons && lit2 instanceof Fay$$Cons) {
    do {
      if (!Fay$$equal(lit1.car,lit2.car))
        return false;
      lit1 = Fay$$_(lit1.cdr), lit2 = Fay$$_(lit2.cdr);
      if (lit1 === null || lit2 === null)
        return lit1 === lit2;
    } while (true);
  } else if (typeof lit1 == 'object' && typeof lit2 == 'object' && lit1 && lit2 &&
             lit1.constructor === lit2.constructor) {
    for(var x in lit1) {
      if(!(lit1.hasOwnProperty(x) && lit2.hasOwnProperty(x) &&
           Fay$$equal(lit1[x],lit2[x])))
        return false;
    }
    return true;
  } else {
    return false;
  }
}

// Built-in ==.
function Fay$$eq(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$equal(x,y);
    });
  };
}

function Fay$$eq$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$equal(x,y);
  });

}

// Built-in /=.
function Fay$$neq(x){
  return function(y){
    return new Fay$$$(function(){
      return !(Fay$$equal(x,y));
    });
  };
}

// Built-in /=.
function Fay$$neq$36$uncurried(x,y){

  return new Fay$$$(function(){
    return !(Fay$$equal(x,y));
  });

}

// Built-in >.
function Fay$$gt(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) > Fay$$_(y);
    });
  };
}

// Built-in >.
function Fay$$gt$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) > Fay$$_(y);
  });

}

// Built-in <.
function Fay$$lt(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) < Fay$$_(y);
    });
  };
}


// Built-in <.
function Fay$$lt$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) < Fay$$_(y);
  });

}


// Built-in >=.
function Fay$$gte(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) >= Fay$$_(y);
    });
  };
}

// Built-in >=.
function Fay$$gte$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) >= Fay$$_(y);
  });

}

// Built-in <=.
function Fay$$lte(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) <= Fay$$_(y);
    });
  };
}

// Built-in <=.
function Fay$$lte$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) <= Fay$$_(y);
  });

}

// Built-in &&.
function Fay$$and(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) && Fay$$_(y);
    });
  };
}

// Built-in &&.
function Fay$$and$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) && Fay$$_(y);
  });
  ;
}

// Built-in ||.
function Fay$$or(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) || Fay$$_(y);
    });
  };
}

// Built-in ||.
function Fay$$or$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) || Fay$$_(y);
  });

}

/*******************************************************************************
 * Mutable references.
 */

// Make a new mutable reference.
function Fay$$Ref(x){
  this.value = x;
}

// Write to the ref.
function Fay$$writeRef(ref,x){
  ref.value = x;
}

// Get the value from the ref.
function Fay$$readRef(ref,x){
  return ref.value;
}

/*******************************************************************************
 * Dates.
 */
function Fay$$date(str){
  return window.Date.parse(str);
}

/*******************************************************************************
 * Application code.
 */

var Language$Fay$FFI$Nullable = function(slot1){
  return new Fay$$$(function(){
    return new $_Language$Fay$FFI$Nullable(slot1);
  });
};
var Language$Fay$FFI$Null = new Fay$$$(function(){
  return new $_Language$Fay$FFI$Null();
});
var Language$Fay$FFI$Defined = function(slot1){
  return new Fay$$$(function(){
    return new $_Language$Fay$FFI$Defined(slot1);
  });
};
var Language$Fay$FFI$Undefined = new Fay$$$(function(){
  return new $_Language$Fay$FFI$Undefined();
});
var Prelude$Just = function(slot1){
  return new Fay$$$(function(){
    return new $_Prelude$Just(slot1);
  });
};
var Prelude$Nothing = new Fay$$$(function(){
  return new $_Prelude$Nothing();
});
var Prelude$Left = function(slot1){
  return new Fay$$$(function(){
    return new $_Prelude$Left(slot1);
  });
};
var Prelude$Right = function(slot1){
  return new Fay$$$(function(){
    return new $_Prelude$Right(slot1);
  });
};
var Prelude$maybe = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        if (Fay$$_($p3) instanceof $_Prelude$Nothing) {
          var m = $p1;
          return m;
        }
        if (Fay$$_($p3) instanceof $_Prelude$Just) {
          var x = Fay$$_($p3).slot1;
          var f = $p2;
          return Fay$$_(f)(x);
        }
        throw ["unhandled case in maybe",[$p1,$p2,$p3]];
      });
    };
  };
};
var Prelude$Ratio = function(slot1){
  return function(slot2){
    return new Fay$$$(function(){
      return new $_Prelude$Ratio(slot1,slot2);
    });
  };
};
var Prelude$$62$$62$$61$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$bind(Fay$$fayToJs(["action",[["unknown"]]],$p1))(Fay$$fayToJs(["function",[["unknown"],["action",[["unknown"]]]]],$p2))));
    });
  };
};
var Prelude$$62$$62$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$then(Fay$$fayToJs(["action",[["unknown"]]],$p1))(Fay$$fayToJs(["action",[["unknown"]]],$p2))));
    });
  };
};
var Prelude$$_return = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$return(Fay$$fayToJs(["unknown"],$p1))));
  });
};
var Prelude$when = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var m = $p2;
      var p = $p1;
      return Fay$$_(p) ? Fay$$_(Fay$$_(Fay$$then)(m))(Fay$$_(Fay$$$_return)(Fay$$unit)) : Fay$$_(Fay$$$_return)(Fay$$unit);
    });
  };
};
var Prelude$forM_ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var m = $p2;
      var $tmp1 = Fay$$_($p1);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        return Fay$$_(Fay$$_(Fay$$then)(Fay$$_(m)(x)))(Fay$$_(Fay$$_(Prelude$forM_)(xs))(m));
      }
      if (Fay$$_($p1) === null) {
        return Fay$$_(Fay$$$_return)(Fay$$unit);
      }
      throw ["unhandled case in forM_",[$p1,$p2]];
    });
  };
};
var Prelude$mapM_ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var m = $p1;
        return Fay$$_(Fay$$_(Fay$$then)(Fay$$_(m)(x)))(Fay$$_(Fay$$_(Prelude$mapM_)(m))(xs));
      }
      if (Fay$$_($p2) === null) {
        return Fay$$_(Fay$$$_return)(Fay$$unit);
      }
      throw ["unhandled case in mapM_",[$p1,$p2]];
    });
  };
};
var Prelude$$61$$60$$60$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var x = $p2;
      var f = $p1;
      return Fay$$_(Fay$$_(Fay$$bind)(x))(f);
    });
  };
};
var Prelude$sequence = function($p1){
  return new Fay$$$(function(){
    var ms = $p1;
    return (function(){
      var k = function($p1){
        return function($p2){
          return new Fay$$$(function(){
            var m$39$ = $p2;
            var m = $p1;
            return Fay$$_(Fay$$_(Fay$$bind)(m))(function($p1){
              var x = $p1;
              return Fay$$_(Fay$$_(Fay$$bind)(m$39$))(function($p1){
                var xs = $p1;
                return Fay$$_(Fay$$$_return)(Fay$$_(Fay$$_(Fay$$cons)(x))(xs));
              });
            });
          });
        };
      };
      return Fay$$_(Fay$$_(Fay$$_(Prelude$foldr)(k))(Fay$$_(Fay$$$_return)(null)))(ms);
    })();
  });
};
var Prelude$sequence_ = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return Fay$$_(Fay$$$_return)(Fay$$unit);
    }
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      var m = $tmp1.car;
      var ms = $tmp1.cdr;
      return Fay$$_(Fay$$_(Fay$$then)(m))(Fay$$_(Prelude$sequence_)(ms));
    }
    throw ["unhandled case in sequence_",[$p1]];
  });
};
var Prelude$GT = new Fay$$$(function(){
  return new $_Prelude$GT();
});
var Prelude$LT = new Fay$$$(function(){
  return new $_Prelude$LT();
});
var Prelude$EQ = new Fay$$$(function(){
  return new $_Prelude$EQ();
});
var Prelude$compare = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var y = $p2;
      var x = $p1;
      return Fay$$_(Fay$$_(Fay$$_(Fay$$gt)(x))(y)) ? Prelude$GT : Fay$$_(Fay$$_(Fay$$_(Fay$$lt)(x))(y)) ? Prelude$LT : Prelude$EQ;
    });
  };
};
var Prelude$succ = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Fay$$_(Fay$$add)(x))(1);
  });
};
var Prelude$pred = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Fay$$_(Fay$$sub)(x))(1);
  });
};
var Prelude$enumFrom = function($p1){
  return new Fay$$$(function(){
    var i = $p1;
    return Fay$$_(Fay$$_(Fay$$cons)(i))(Fay$$_(Prelude$enumFrom)(Fay$$_(Fay$$_(Fay$$add)(i))(1)));
  });
};
var Prelude$enumFromTo = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var n = $p2;
      var i = $p1;
      return Fay$$_(Fay$$_(Fay$$_(Fay$$gt)(i))(n)) ? null : Fay$$_(Fay$$_(Fay$$cons)(i))(Fay$$_(Fay$$_(Prelude$enumFromTo)(Fay$$_(Fay$$_(Fay$$add)(i))(1)))(n));
    });
  };
};
var Prelude$enumFromBy = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var by = $p2;
      var fr = $p1;
      return Fay$$_(Fay$$_(Fay$$cons)(fr))(Fay$$_(Fay$$_(Prelude$enumFromBy)(Fay$$_(Fay$$_(Fay$$add)(fr))(by)))(by));
    });
  };
};
var Prelude$enumFromThen = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var th = $p2;
      var fr = $p1;
      return Fay$$_(Fay$$_(Prelude$enumFromBy)(fr))(Fay$$_(Fay$$_(Fay$$sub)(th))(fr));
    });
  };
};
var Prelude$enumFromByTo = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        var to = $p3;
        var by = $p2;
        var fr = $p1;
        return (function(){
          var neg = function($p1){
            return new Fay$$$(function(){
              var x = $p1;
              return Fay$$_(Fay$$_(Fay$$_(Fay$$lt)(x))(to)) ? null : Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(neg)(Fay$$_(Fay$$_(Fay$$add)(x))(by)));
            });
          };
          var pos = function($p1){
            return new Fay$$$(function(){
              var x = $p1;
              return Fay$$_(Fay$$_(Fay$$_(Fay$$gt)(x))(to)) ? null : Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(pos)(Fay$$_(Fay$$_(Fay$$add)(x))(by)));
            });
          };
          return Fay$$_(Fay$$_(Fay$$_(Fay$$lt)(by))(0)) ? Fay$$_(neg)(fr) : Fay$$_(pos)(fr);
        })();
      });
    };
  };
};
var Prelude$enumFromThenTo = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        var to = $p3;
        var th = $p2;
        var fr = $p1;
        return Fay$$_(Fay$$_(Fay$$_(Prelude$enumFromByTo)(fr))(Fay$$_(Fay$$_(Fay$$sub)(th))(fr)))(to);
      });
    };
  };
};
var Prelude$fromIntegral = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_double(Fay$$fayToJs_int($p1));
  });
};
var Prelude$fromInteger = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_double(Fay$$fayToJs_int($p1));
  });
};
var Prelude$not = function($p1){
  return new Fay$$$(function(){
    var p = $p1;
    return Fay$$_(p) ? false : true;
  });
};
var Prelude$otherwise = true;
var Prelude$show = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_string(JSON.stringify(Fay$$fayToJs(["automatic"],$p1)));
  });
};
var Prelude$error = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay(["unknown"],(function() { throw Fay$$fayToJs_string($p1) })());
  });
};
var Prelude$$_undefined = new Fay$$$(function(){
  return Fay$$_(Prelude$error)(Fay$$list("Prelude.undefined"));
});
var Prelude$either = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        if (Fay$$_($p3) instanceof $_Prelude$Left) {
          var a = Fay$$_($p3).slot1;
          var f = $p1;
          return Fay$$_(f)(a);
        }
        if (Fay$$_($p3) instanceof $_Prelude$Right) {
          var b = Fay$$_($p3).slot1;
          var g = $p2;
          return Fay$$_(g)(b);
        }
        throw ["unhandled case in either",[$p1,$p2,$p3]];
      });
    };
  };
};
var Prelude$until = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        var x = $p3;
        var f = $p2;
        var p = $p1;
        return Fay$$_(Fay$$_(p)(x)) ? x : Fay$$_(Fay$$_(Fay$$_(Prelude$until)(p))(f))(Fay$$_(f)(x));
      });
    };
  };
};
var Prelude$$36$$33$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var x = $p2;
      var f = $p1;
      return Fay$$_(Fay$$_(Fay$$seq)(x))(Fay$$_(f)(x));
    });
  };
};
var Prelude$$_const = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var a = $p1;
      return a;
    });
  };
};
var Prelude$id = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return x;
  });
};
var Prelude$$46$ = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        var x = $p3;
        var g = $p2;
        var f = $p1;
        return Fay$$_(f)(Fay$$_(g)(x));
      });
    };
  };
};
var Prelude$$36$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var x = $p2;
      var f = $p1;
      return Fay$$_(f)(x);
    });
  };
};
var Prelude$flip = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        var y = $p3;
        var x = $p2;
        var f = $p1;
        return Fay$$_(Fay$$_(f)(y))(x);
      });
    };
  };
};
var Prelude$curry = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        var y = $p3;
        var x = $p2;
        var f = $p1;
        return Fay$$_(f)(Fay$$list([x,y]));
      });
    };
  };
};
var Prelude$uncurry = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var p = $p2;
      var f = $p1;
      return (function($tmp1){
        if (Fay$$listLen(Fay$$_($tmp1),2)) {
          var x = Fay$$index(0,Fay$$_($tmp1));
          var y = Fay$$index(1,Fay$$_($tmp1));
          return Fay$$_(Fay$$_(f)(x))(y);
        }
        return (function(){ throw (["unhandled case",$tmp1]); })();
      })(p);
    });
  };
};
var Prelude$snd = function($p1){
  return new Fay$$$(function(){
    if (Fay$$listLen(Fay$$_($p1),2)) {
      var x = Fay$$index(1,Fay$$_($p1));
      return x;
    }
    throw ["unhandled case in snd",[$p1]];
  });
};
var Prelude$fst = function($p1){
  return new Fay$$$(function(){
    if (Fay$$listLen(Fay$$_($p1),2)) {
      var x = Fay$$index(0,Fay$$_($p1));
      return x;
    }
    throw ["unhandled case in fst",[$p1]];
  });
};
var Prelude$div = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var y = $p2;
      var x = $p1;
      if (Fay$$_(Fay$$_(Fay$$_(Fay$$and)(Fay$$_(Fay$$_(Fay$$gt)(x))(0)))(Fay$$_(Fay$$_(Fay$$lt)(y))(0)))) {
        return Fay$$_(Fay$$_(Fay$$sub)(Fay$$_(Fay$$_(Prelude$quot)(Fay$$_(Fay$$_(Fay$$sub)(x))(1)))(y)))(1);
      } else {if (Fay$$_(Fay$$_(Fay$$_(Fay$$and)(Fay$$_(Fay$$_(Fay$$lt)(x))(0)))(Fay$$_(Fay$$_(Fay$$gt)(y))(0)))) {
          return Fay$$_(Fay$$_(Fay$$sub)(Fay$$_(Fay$$_(Prelude$quot)(Fay$$_(Fay$$_(Fay$$add)(x))(1)))(y)))(1);
        }
      }
      var y = $p2;
      var x = $p1;
      return Fay$$_(Fay$$_(Prelude$quot)(x))(y);
    });
  };
};
var Prelude$mod = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var y = $p2;
      var x = $p1;
      if (Fay$$_(Fay$$_(Fay$$_(Fay$$and)(Fay$$_(Fay$$_(Fay$$gt)(x))(0)))(Fay$$_(Fay$$_(Fay$$lt)(y))(0)))) {
        return Fay$$_(Fay$$_(Fay$$add)(Fay$$_(Fay$$_(Fay$$add)(Fay$$_(Fay$$_(Prelude$rem)(Fay$$_(Fay$$_(Fay$$sub)(x))(1)))(y)))(y)))(1);
      } else {if (Fay$$_(Fay$$_(Fay$$_(Fay$$and)(Fay$$_(Fay$$_(Fay$$lt)(x))(0)))(Fay$$_(Fay$$_(Fay$$gt)(y))(0)))) {
          return Fay$$_(Fay$$_(Fay$$sub)(Fay$$_(Fay$$_(Fay$$add)(Fay$$_(Fay$$_(Prelude$rem)(Fay$$_(Fay$$_(Fay$$add)(x))(1)))(y)))(y)))(1);
        }
      }
      var y = $p2;
      var x = $p1;
      return Fay$$_(Fay$$_(Prelude$rem)(x))(y);
    });
  };
};
var Prelude$divMod = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var y = $p2;
      var x = $p1;
      if (Fay$$_(Fay$$_(Fay$$_(Fay$$and)(Fay$$_(Fay$$_(Fay$$gt)(x))(0)))(Fay$$_(Fay$$_(Fay$$lt)(y))(0)))) {
        return (function($tmp1){
          if (Fay$$listLen(Fay$$_($tmp1),2)) {
            var q = Fay$$index(0,Fay$$_($tmp1));
            var r = Fay$$index(1,Fay$$_($tmp1));
            return Fay$$list([Fay$$_(Fay$$_(Fay$$sub)(q))(1),Fay$$_(Fay$$_(Fay$$add)(Fay$$_(Fay$$_(Fay$$add)(r))(y)))(1)]);
          }
          return (function(){ throw (["unhandled case",$tmp1]); })();
        })(Fay$$_(Fay$$_(Prelude$quotRem)(Fay$$_(Fay$$_(Fay$$sub)(x))(1)))(y));
      } else {if (Fay$$_(Fay$$_(Fay$$_(Fay$$and)(Fay$$_(Fay$$_(Fay$$lt)(x))(0)))(Fay$$_(Fay$$_(Fay$$gt)(y))(1)))) {
          return (function($tmp1){
            if (Fay$$listLen(Fay$$_($tmp1),2)) {
              var q = Fay$$index(0,Fay$$_($tmp1));
              var r = Fay$$index(1,Fay$$_($tmp1));
              return Fay$$list([Fay$$_(Fay$$_(Fay$$sub)(q))(1),Fay$$_(Fay$$_(Fay$$sub)(Fay$$_(Fay$$_(Fay$$add)(r))(y)))(1)]);
            }
            return (function(){ throw (["unhandled case",$tmp1]); })();
          })(Fay$$_(Fay$$_(Prelude$quotRem)(Fay$$_(Fay$$_(Fay$$add)(x))(1)))(y));
        }
      }
      var y = $p2;
      var x = $p1;
      return Fay$$_(Fay$$_(Prelude$quotRem)(x))(y);
    });
  };
};
var Prelude$min = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay(["unknown"],Math.min(Fay$$_(Fay$$fayToJs(["unknown"],$p1)),Fay$$_(Fay$$fayToJs(["unknown"],$p2))));
    });
  };
};
var Prelude$max = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay(["unknown"],Math.max(Fay$$_(Fay$$fayToJs(["unknown"],$p1)),Fay$$_(Fay$$fayToJs(["unknown"],$p2))));
    });
  };
};
var Prelude$recip = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Fay$$_(Fay$$divi)(1))(x);
  });
};
var Prelude$negate = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return (-(Fay$$_(x)));
  });
};
var Prelude$abs = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Fay$$_(Fay$$_(Fay$$lt)(x))(0)) ? Fay$$_(Prelude$negate)(x) : x;
  });
};
var Prelude$signum = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Fay$$_(Fay$$_(Fay$$gt)(x))(0)) ? 1 : Fay$$_(Fay$$_(Fay$$_(Fay$$eq)(x))(0)) ? 0 : (-(1));
  });
};
var Prelude$pi = new Fay$$$(function(){
  return Fay$$jsToFay_double(Math.PI);
});
var Prelude$exp = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_double(Math.exp(Fay$$fayToJs_double($p1)));
  });
};
var Prelude$sqrt = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_double(Math.sqrt(Fay$$fayToJs_double($p1)));
  });
};
var Prelude$log = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_double(Math.log(Fay$$fayToJs_double($p1)));
  });
};
var Prelude$$42$$42$ = new Fay$$$(function(){
  return Prelude$unsafePow;
});
var Prelude$$94$$94$ = new Fay$$$(function(){
  return Prelude$unsafePow;
});
var Prelude$unsafePow = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay(["unknown"],Math.pow(Fay$$_(Fay$$fayToJs(["unknown"],$p1)),Fay$$_(Fay$$fayToJs(["unknown"],$p2))));
    });
  };
};
var Prelude$$94$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var b = $p2;
      var a = $p1;
      if (Fay$$_(Fay$$_(Fay$$_(Fay$$lt)(b))(0))) {
        return Fay$$_(Prelude$error)(Fay$$list("(^): negative exponent"));
      } else {if (Fay$$_(Fay$$_(Fay$$_(Fay$$eq)(b))(0))) {
          return 1;
        } else {if (Fay$$_(Fay$$_(Prelude$even)(b))) {
            return (function(){
              var x = new Fay$$$(function(){
                return Fay$$_(Fay$$_(Prelude$$94$)(a))(Fay$$_(Fay$$_(Prelude$quot)(b))(2));
              });
              return Fay$$_(Fay$$_(Fay$$mult)(x))(x);
            })();
          }
        }
      }
      var b = $p2;
      var a = $p1;
      return Fay$$_(Fay$$_(Fay$$mult)(a))(Fay$$_(Fay$$_(Prelude$$94$)(a))(Fay$$_(Fay$$_(Fay$$sub)(b))(1)));
    });
  };
};
var Prelude$logBase = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var x = $p2;
      var b = $p1;
      return Fay$$_(Fay$$_(Fay$$divi)(Fay$$_(Prelude$log)(x)))(Fay$$_(Prelude$log)(b));
    });
  };
};
var Prelude$sin = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_double(Math.sin(Fay$$fayToJs_double($p1)));
  });
};
var Prelude$tan = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_double(Math.tan(Fay$$fayToJs_double($p1)));
  });
};
var Prelude$cos = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_double(Math.cos(Fay$$fayToJs_double($p1)));
  });
};
var Prelude$asin = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_double(Math.asin(Fay$$fayToJs_double($p1)));
  });
};
var Prelude$atan = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_double(Math.atan(Fay$$fayToJs_double($p1)));
  });
};
var Prelude$acos = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_double(Math.acos(Fay$$fayToJs_double($p1)));
  });
};
var Prelude$sinh = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Fay$$_(Fay$$divi)(Fay$$_(Fay$$_(Fay$$sub)(Fay$$_(Prelude$exp)(x)))(Fay$$_(Prelude$exp)((-(Fay$$_(x)))))))(2);
  });
};
var Prelude$tanh = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return (function(){
      var a = new Fay$$$(function(){
        return Fay$$_(Prelude$exp)(x);
      });
      var b = new Fay$$$(function(){
        return Fay$$_(Prelude$exp)((-(Fay$$_(x))));
      });
      return Fay$$_(Fay$$_(Fay$$divi)(Fay$$_(Fay$$_(Fay$$sub)(a))(b)))(Fay$$_(Fay$$_(Fay$$add)(a))(b));
    })();
  });
};
var Prelude$cosh = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Fay$$_(Fay$$divi)(Fay$$_(Fay$$_(Fay$$add)(Fay$$_(Prelude$exp)(x)))(Fay$$_(Prelude$exp)((-(Fay$$_(x)))))))(2);
  });
};
var Prelude$asinh = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Prelude$log)(Fay$$_(Fay$$_(Fay$$add)(x))(Fay$$_(Prelude$sqrt)(Fay$$_(Fay$$_(Fay$$add)(Fay$$_(Fay$$_(Prelude$$42$$42$)(x))(2)))(1))));
  });
};
var Prelude$atanh = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Fay$$_(Fay$$divi)(Fay$$_(Prelude$log)(Fay$$_(Fay$$_(Fay$$divi)(Fay$$_(Fay$$_(Fay$$add)(1))(x)))(Fay$$_(Fay$$_(Fay$$sub)(1))(x)))))(2);
  });
};
var Prelude$acosh = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Prelude$log)(Fay$$_(Fay$$_(Fay$$add)(x))(Fay$$_(Prelude$sqrt)(Fay$$_(Fay$$_(Fay$$sub)(Fay$$_(Fay$$_(Prelude$$42$$42$)(x))(2)))(1))));
  });
};
var Prelude$properFraction = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return (function(){
      var a = new Fay$$$(function(){
        return Fay$$_(Prelude$truncate)(x);
      });
      return Fay$$list([a,Fay$$_(Fay$$_(Fay$$sub)(x))(Fay$$_(Prelude$fromIntegral)(a))]);
    })();
  });
};
var Prelude$truncate = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Fay$$_(Fay$$_(Fay$$lt)(x))(0)) ? Fay$$_(Prelude$ceiling)(x) : Fay$$_(Prelude$floor)(x);
  });
};
var Prelude$round = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_int(Math.round(Fay$$fayToJs_double($p1)));
  });
};
var Prelude$ceiling = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_int(Math.ceil(Fay$$fayToJs_double($p1)));
  });
};
var Prelude$floor = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_int(Math.floor(Fay$$fayToJs_double($p1)));
  });
};
var Prelude$subtract = new Fay$$$(function(){
  return Fay$$_(Prelude$flip)(Fay$$sub);
});
var Prelude$even = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Fay$$_(Fay$$eq)(Fay$$_(Fay$$_(Prelude$rem)(x))(2)))(0);
  });
};
var Prelude$odd = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Prelude$not)(Fay$$_(Prelude$even)(x));
  });
};
var Prelude$gcd = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var b = $p2;
      var a = $p1;
      return (function(){
        var go = function($p1){
          return function($p2){
            return new Fay$$$(function(){
              if (Fay$$_($p2) === 0) {
                var x = $p1;
                return x;
              }
              var y = $p2;
              var x = $p1;
              return Fay$$_(Fay$$_(go)(y))(Fay$$_(Fay$$_(Prelude$rem)(x))(y));
            });
          };
        };
        return Fay$$_(Fay$$_(go)(Fay$$_(Prelude$abs)(a)))(Fay$$_(Prelude$abs)(b));
      })();
    });
  };
};
var Prelude$quot = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var y = $p2;
      var x = $p1;
      return Fay$$_(Fay$$_(Fay$$_(Fay$$eq)(y))(0)) ? Fay$$_(Prelude$error)(Fay$$list("Division by zero")) : Fay$$_(Fay$$_(Prelude$quot$39$)(x))(y);
    });
  };
};
var Prelude$quot$39$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay_int(~~(Fay$$fayToJs_int($p1)/Fay$$fayToJs_int($p2)));
    });
  };
};
var Prelude$quotRem = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var y = $p2;
      var x = $p1;
      return Fay$$list([Fay$$_(Fay$$_(Prelude$quot)(x))(y),Fay$$_(Fay$$_(Prelude$rem)(x))(y)]);
    });
  };
};
var Prelude$rem = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var y = $p2;
      var x = $p1;
      return Fay$$_(Fay$$_(Fay$$_(Fay$$eq)(y))(0)) ? Fay$$_(Prelude$error)(Fay$$list("Division by zero")) : Fay$$_(Fay$$_(Prelude$rem$39$)(x))(y);
    });
  };
};
var Prelude$rem$39$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay_int(Fay$$fayToJs_int($p1) % Fay$$fayToJs_int($p2));
    });
  };
};
var Prelude$lcm = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === 0) {
        return 0;
      }
      if (Fay$$_($p1) === 0) {
        return 0;
      }
      var b = $p2;
      var a = $p1;
      return Fay$$_(Prelude$abs)(Fay$$_(Fay$$_(Fay$$mult)(Fay$$_(Fay$$_(Prelude$quot)(a))(Fay$$_(Fay$$_(Prelude$gcd)(a))(b))))(b));
    });
  };
};
var Prelude$find = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var p = $p1;
        return Fay$$_(Fay$$_(p)(x)) ? Fay$$_(Prelude$Just)(x) : Fay$$_(Fay$$_(Prelude$find)(p))(xs);
      }
      if (Fay$$_($p2) === null) {
        return Prelude$Nothing;
      }
      throw ["unhandled case in find",[$p1,$p2]];
    });
  };
};
var Prelude$filter = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var p = $p1;
        return Fay$$_(Fay$$_(p)(x)) ? Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(Fay$$_(Prelude$filter)(p))(xs)) : Fay$$_(Fay$$_(Prelude$filter)(p))(xs);
      }
      if (Fay$$_($p2) === null) {
        return null;
      }
      throw ["unhandled case in filter",[$p1,$p2]];
    });
  };
};
var Prelude$$_null = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return true;
    }
    return false;
  });
};
var Prelude$map = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === null) {
        return null;
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var f = $p1;
        return Fay$$_(Fay$$_(Fay$$cons)(Fay$$_(f)(x)))(Fay$$_(Fay$$_(Prelude$map)(f))(xs));
      }
      throw ["unhandled case in map",[$p1,$p2]];
    });
  };
};
var Prelude$nub = function($p1){
  return new Fay$$$(function(){
    var ls = $p1;
    return Fay$$_(Fay$$_(Prelude$nub$39$)(ls))(null);
  });
};
var Prelude$nub$39$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p1) === null) {
        return null;
      }
      var ls = $p2;
      var $tmp1 = Fay$$_($p1);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        return Fay$$_(Fay$$_(Fay$$_(Prelude$elem)(x))(ls)) ? Fay$$_(Fay$$_(Prelude$nub$39$)(xs))(ls) : Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(Fay$$_(Prelude$nub$39$)(xs))(Fay$$_(Fay$$_(Fay$$cons)(x))(ls)));
      }
      throw ["unhandled case in nub'",[$p1,$p2]];
    });
  };
};
var Prelude$elem = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var y = $tmp1.car;
        var ys = $tmp1.cdr;
        var x = $p1;
        return Fay$$_(Fay$$_(Fay$$or)(Fay$$_(Fay$$_(Fay$$eq)(x))(y)))(Fay$$_(Fay$$_(Prelude$elem)(x))(ys));
      }
      if (Fay$$_($p2) === null) {
        return false;
      }
      throw ["unhandled case in elem",[$p1,$p2]];
    });
  };
};
var Prelude$notElem = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var ys = $p2;
      var x = $p1;
      return Fay$$_(Prelude$not)(Fay$$_(Fay$$_(Prelude$elem)(x))(ys));
    });
  };
};
var Prelude$sort = new Fay$$$(function(){
  return Fay$$_(Prelude$sortBy)(Prelude$compare);
});
var Prelude$sortBy = function($p1){
  return new Fay$$$(function(){
    var cmp = $p1;
    return Fay$$_(Fay$$_(Prelude$foldr)(Fay$$_(Prelude$insertBy)(cmp)))(null);
  });
};
var Prelude$insertBy = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        if (Fay$$_($p3) === null) {
          var x = $p2;
          return Fay$$list([x]);
        }
        var ys = $p3;
        var x = $p2;
        var cmp = $p1;
        return (function($tmp1){
          if (Fay$$_($tmp1) === null) {
            return Fay$$list([x]);
          }
          var $tmp2 = Fay$$_($tmp1);
          if ($tmp2 instanceof Fay$$Cons) {
            var y = $tmp2.car;
            var ys$39$ = $tmp2.cdr;
            return (function($tmp2){
              if (Fay$$_($tmp2) instanceof $_Prelude$GT) {
                return Fay$$_(Fay$$_(Fay$$cons)(y))(Fay$$_(Fay$$_(Fay$$_(Prelude$insertBy)(cmp))(x))(ys$39$));
              }
              return Fay$$_(Fay$$_(Fay$$cons)(x))(ys);
            })(Fay$$_(Fay$$_(cmp)(x))(y));
          }
          return (function(){ throw (["unhandled case",$tmp1]); })();
        })(ys);
      });
    };
  };
};
var Prelude$conc = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var ys = $p2;
      var $tmp1 = Fay$$_($p1);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        return Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(Fay$$_(Prelude$conc)(xs))(ys));
      }
      var ys = $p2;
      if (Fay$$_($p1) === null) {
        return ys;
      }
      throw ["unhandled case in conc",[$p1,$p2]];
    });
  };
};
var Prelude$concat = new Fay$$$(function(){
  return Fay$$_(Fay$$_(Prelude$foldr)(Prelude$conc))(null);
});
var Prelude$concatMap = function($p1){
  return new Fay$$$(function(){
    var f = $p1;
    return Fay$$_(Fay$$_(Prelude$foldr)(Fay$$_(Fay$$_(Prelude$$46$)(Prelude$$43$$43$))(f)))(null);
  });
};
var Prelude$foldr = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        if (Fay$$_($p3) === null) {
          var z = $p2;
          return z;
        }
        var $tmp1 = Fay$$_($p3);
        if ($tmp1 instanceof Fay$$Cons) {
          var x = $tmp1.car;
          var xs = $tmp1.cdr;
          var z = $p2;
          var f = $p1;
          return Fay$$_(Fay$$_(f)(x))(Fay$$_(Fay$$_(Fay$$_(Prelude$foldr)(f))(z))(xs));
        }
        throw ["unhandled case in foldr",[$p1,$p2,$p3]];
      });
    };
  };
};
var Prelude$foldr1 = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$listLen(Fay$$_($p2),1)) {
        var x = Fay$$index(0,Fay$$_($p2));
        return x;
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var f = $p1;
        return Fay$$_(Fay$$_(f)(x))(Fay$$_(Fay$$_(Prelude$foldr1)(f))(xs));
      }
      if (Fay$$_($p2) === null) {
        return Fay$$_(Prelude$error)(Fay$$list("foldr1: empty list"));
      }
      throw ["unhandled case in foldr1",[$p1,$p2]];
    });
  };
};
var Prelude$foldl = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        if (Fay$$_($p3) === null) {
          var z = $p2;
          return z;
        }
        var $tmp1 = Fay$$_($p3);
        if ($tmp1 instanceof Fay$$Cons) {
          var x = $tmp1.car;
          var xs = $tmp1.cdr;
          var z = $p2;
          var f = $p1;
          return Fay$$_(Fay$$_(Fay$$_(Prelude$foldl)(f))(Fay$$_(Fay$$_(f)(z))(x)))(xs);
        }
        throw ["unhandled case in foldl",[$p1,$p2,$p3]];
      });
    };
  };
};
var Prelude$foldl1 = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var f = $p1;
        return Fay$$_(Fay$$_(Fay$$_(Prelude$foldl)(f))(x))(xs);
      }
      if (Fay$$_($p2) === null) {
        return Fay$$_(Prelude$error)(Fay$$list("foldl1: empty list"));
      }
      throw ["unhandled case in foldl1",[$p1,$p2]];
    });
  };
};
var Prelude$$43$$43$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var y = $p2;
      var x = $p1;
      return Fay$$_(Fay$$_(Prelude$conc)(x))(y);
    });
  };
};
var Prelude$$33$$33$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var b = $p2;
      var a = $p1;
      return (function(){
        var go = function($p1){
          return function($p2){
            return new Fay$$$(function(){
              if (Fay$$_($p1) === null) {
                return Fay$$_(Prelude$error)(Fay$$list("(!!): index too large"));
              }
              if (Fay$$_($p2) === 0) {
                var $tmp1 = Fay$$_($p1);
                if ($tmp1 instanceof Fay$$Cons) {
                  var h = $tmp1.car;
                  return h;
                }
              }
              var n = $p2;
              var $tmp1 = Fay$$_($p1);
              if ($tmp1 instanceof Fay$$Cons) {
                var t = $tmp1.cdr;
                return Fay$$_(Fay$$_(go)(t))(Fay$$_(Fay$$_(Fay$$sub)(n))(1));
              }
              throw ["unhandled case in go",[$p1,$p2]];
            });
          };
        };
        return Fay$$_(Fay$$_(Fay$$_(Fay$$lt)(b))(0)) ? Fay$$_(Prelude$error)(Fay$$list("(!!): negative index")) : Fay$$_(Fay$$_(go)(a))(b);
      })();
    });
  };
};
var Prelude$head = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return Fay$$_(Prelude$error)(Fay$$list("head: empty list"));
    }
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      var h = $tmp1.car;
      return h;
    }
    throw ["unhandled case in head",[$p1]];
  });
};
var Prelude$tail = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return Fay$$_(Prelude$error)(Fay$$list("tail: empty list"));
    }
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      var t = $tmp1.cdr;
      return t;
    }
    throw ["unhandled case in tail",[$p1]];
  });
};
var Prelude$init = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return Fay$$_(Prelude$error)(Fay$$list("init: empty list"));
    }
    if (Fay$$listLen(Fay$$_($p1),1)) {
      var a = Fay$$index(0,Fay$$_($p1));
      return null;
    }
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      var h = $tmp1.car;
      var t = $tmp1.cdr;
      return Fay$$_(Fay$$_(Fay$$cons)(h))(Fay$$_(Prelude$init)(t));
    }
    throw ["unhandled case in init",[$p1]];
  });
};
var Prelude$last = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return Fay$$_(Prelude$error)(Fay$$list("last: empty list"));
    }
    if (Fay$$listLen(Fay$$_($p1),1)) {
      var a = Fay$$index(0,Fay$$_($p1));
      return a;
    }
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      var t = $tmp1.cdr;
      return Fay$$_(Prelude$last)(t);
    }
    throw ["unhandled case in last",[$p1]];
  });
};
var Prelude$iterate = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var x = $p2;
      var f = $p1;
      return Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(Fay$$_(Prelude$iterate)(f))(Fay$$_(f)(x)));
    });
  };
};
var Prelude$repeat = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(Prelude$repeat)(x));
  });
};
var Prelude$replicate = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p1) === 0) {
        return null;
      }
      var x = $p2;
      var n = $p1;
      return Fay$$_(Fay$$_(Fay$$_(Fay$$lt)(n))(0)) ? null : Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(Fay$$_(Prelude$replicate)(Fay$$_(Fay$$_(Fay$$sub)(n))(1)))(x));
    });
  };
};
var Prelude$cycle = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return Fay$$_(Prelude$error)(Fay$$list("cycle: empty list"));
    }
    var xs = $p1;
    return (function(){
      var xs$39$ = new Fay$$$(function(){
        return Fay$$_(Fay$$_(Prelude$$43$$43$)(xs))(xs$39$);
      });
      return xs$39$;
    })();
  });
};
var Prelude$take = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p1) === 0) {
        return null;
      }
      if (Fay$$_($p2) === null) {
        return null;
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var n = $p1;
        return Fay$$_(Fay$$_(Fay$$_(Fay$$lt)(n))(0)) ? null : Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(Fay$$_(Prelude$take)(Fay$$_(Fay$$_(Fay$$sub)(n))(1)))(xs));
      }
      throw ["unhandled case in take",[$p1,$p2]];
    });
  };
};
var Prelude$drop = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var xs = $p2;
      if (Fay$$_($p1) === 0) {
        return xs;
      }
      if (Fay$$_($p2) === null) {
        return null;
      }
      var xss = $p2;
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var n = $p1;
        return Fay$$_(Fay$$_(Fay$$_(Fay$$lt)(n))(0)) ? xss : Fay$$_(Fay$$_(Prelude$drop)(Fay$$_(Fay$$_(Fay$$sub)(n))(1)))(xs);
      }
      throw ["unhandled case in drop",[$p1,$p2]];
    });
  };
};
var Prelude$splitAt = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var xs = $p2;
      if (Fay$$_($p1) === 0) {
        return Fay$$list([null,xs]);
      }
      if (Fay$$_($p2) === null) {
        return Fay$$list([null,null]);
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var n = $p1;
        return Fay$$_(Fay$$_(Fay$$_(Fay$$lt)(n))(0)) ? Fay$$list([null,Fay$$_(Fay$$_(Fay$$cons)(x))(xs)]) : (function($tmp1){
          if (Fay$$listLen(Fay$$_($tmp1),2)) {
            var a = Fay$$index(0,Fay$$_($tmp1));
            var b = Fay$$index(1,Fay$$_($tmp1));
            return Fay$$list([Fay$$_(Fay$$_(Fay$$cons)(x))(a),b]);
          }
          return (function(){ throw (["unhandled case",$tmp1]); })();
        })(Fay$$_(Fay$$_(Prelude$splitAt)(Fay$$_(Fay$$_(Fay$$sub)(n))(1)))(xs));
      }
      throw ["unhandled case in splitAt",[$p1,$p2]];
    });
  };
};
var Prelude$takeWhile = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === null) {
        return null;
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var p = $p1;
        return Fay$$_(Fay$$_(p)(x)) ? Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(Fay$$_(Prelude$takeWhile)(p))(xs)) : null;
      }
      throw ["unhandled case in takeWhile",[$p1,$p2]];
    });
  };
};
var Prelude$dropWhile = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === null) {
        return null;
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var p = $p1;
        return Fay$$_(Fay$$_(p)(x)) ? Fay$$_(Fay$$_(Prelude$dropWhile)(p))(xs) : Fay$$_(Fay$$_(Fay$$cons)(x))(xs);
      }
      throw ["unhandled case in dropWhile",[$p1,$p2]];
    });
  };
};
var Prelude$span = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === null) {
        return Fay$$list([null,null]);
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var p = $p1;
        return Fay$$_(Fay$$_(p)(x)) ? (function($tmp1){
          if (Fay$$listLen(Fay$$_($tmp1),2)) {
            var a = Fay$$index(0,Fay$$_($tmp1));
            var b = Fay$$index(1,Fay$$_($tmp1));
            return Fay$$list([Fay$$_(Fay$$_(Fay$$cons)(x))(a),b]);
          }
          return (function(){ throw (["unhandled case",$tmp1]); })();
        })(Fay$$_(Fay$$_(Prelude$span)(p))(xs)) : Fay$$list([null,Fay$$_(Fay$$_(Fay$$cons)(x))(xs)]);
      }
      throw ["unhandled case in span",[$p1,$p2]];
    });
  };
};
var Prelude$$_break = function($p1){
  return new Fay$$$(function(){
    var p = $p1;
    return Fay$$_(Prelude$span)(Fay$$_(Fay$$_(Prelude$$46$)(Prelude$not))(p));
  });
};
var Prelude$zipWith = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        var $tmp1 = Fay$$_($p3);
        if ($tmp1 instanceof Fay$$Cons) {
          var b = $tmp1.car;
          var bs = $tmp1.cdr;
          var $tmp1 = Fay$$_($p2);
          if ($tmp1 instanceof Fay$$Cons) {
            var a = $tmp1.car;
            var as = $tmp1.cdr;
            var f = $p1;
            return Fay$$_(Fay$$_(Fay$$cons)(Fay$$_(Fay$$_(f)(a))(b)))(Fay$$_(Fay$$_(Fay$$_(Prelude$zipWith)(f))(as))(bs));
          }
        }
        return null;
      });
    };
  };
};
var Prelude$zipWith3 = function($p1){
  return function($p2){
    return function($p3){
      return function($p4){
        return new Fay$$$(function(){
          var $tmp1 = Fay$$_($p4);
          if ($tmp1 instanceof Fay$$Cons) {
            var c = $tmp1.car;
            var cs = $tmp1.cdr;
            var $tmp1 = Fay$$_($p3);
            if ($tmp1 instanceof Fay$$Cons) {
              var b = $tmp1.car;
              var bs = $tmp1.cdr;
              var $tmp1 = Fay$$_($p2);
              if ($tmp1 instanceof Fay$$Cons) {
                var a = $tmp1.car;
                var as = $tmp1.cdr;
                var f = $p1;
                return Fay$$_(Fay$$_(Fay$$cons)(Fay$$_(Fay$$_(Fay$$_(f)(a))(b))(c)))(Fay$$_(Fay$$_(Fay$$_(Fay$$_(Prelude$zipWith3)(f))(as))(bs))(cs));
              }
            }
          }
          return null;
        });
      };
    };
  };
};
var Prelude$zip = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var b = $tmp1.car;
        var bs = $tmp1.cdr;
        var $tmp1 = Fay$$_($p1);
        if ($tmp1 instanceof Fay$$Cons) {
          var a = $tmp1.car;
          var as = $tmp1.cdr;
          return Fay$$_(Fay$$_(Fay$$cons)(Fay$$list([a,b])))(Fay$$_(Fay$$_(Prelude$zip)(as))(bs));
        }
      }
      return null;
    });
  };
};
var Prelude$zip3 = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        var $tmp1 = Fay$$_($p3);
        if ($tmp1 instanceof Fay$$Cons) {
          var c = $tmp1.car;
          var cs = $tmp1.cdr;
          var $tmp1 = Fay$$_($p2);
          if ($tmp1 instanceof Fay$$Cons) {
            var b = $tmp1.car;
            var bs = $tmp1.cdr;
            var $tmp1 = Fay$$_($p1);
            if ($tmp1 instanceof Fay$$Cons) {
              var a = $tmp1.car;
              var as = $tmp1.cdr;
              return Fay$$_(Fay$$_(Fay$$cons)(Fay$$list([a,b,c])))(Fay$$_(Fay$$_(Fay$$_(Prelude$zip3)(as))(bs))(cs));
            }
          }
        }
        return null;
      });
    };
  };
};
var Prelude$unzip = function($p1){
  return new Fay$$$(function(){
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      if (Fay$$listLen(Fay$$_($tmp1.car),2)) {
        var x = Fay$$index(0,Fay$$_($tmp1.car));
        var y = Fay$$index(1,Fay$$_($tmp1.car));
        var ps = $tmp1.cdr;
        return (function($tmp1){
          if (Fay$$listLen(Fay$$_($tmp1),2)) {
            var xs = Fay$$index(0,Fay$$_($tmp1));
            var ys = Fay$$index(1,Fay$$_($tmp1));
            return Fay$$list([Fay$$_(Fay$$_(Fay$$cons)(x))(xs),Fay$$_(Fay$$_(Fay$$cons)(y))(ys)]);
          }
          return (function(){ throw (["unhandled case",$tmp1]); })();
        })(Fay$$_(Prelude$unzip)(ps));
      }
    }
    if (Fay$$_($p1) === null) {
      return Fay$$list([null,null]);
    }
    throw ["unhandled case in unzip",[$p1]];
  });
};
var Prelude$unzip3 = function($p1){
  return new Fay$$$(function(){
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      if (Fay$$listLen(Fay$$_($tmp1.car),3)) {
        var x = Fay$$index(0,Fay$$_($tmp1.car));
        var y = Fay$$index(1,Fay$$_($tmp1.car));
        var z = Fay$$index(2,Fay$$_($tmp1.car));
        var ps = $tmp1.cdr;
        return (function($tmp1){
          if (Fay$$listLen(Fay$$_($tmp1),3)) {
            var xs = Fay$$index(0,Fay$$_($tmp1));
            var ys = Fay$$index(1,Fay$$_($tmp1));
            var zs = Fay$$index(2,Fay$$_($tmp1));
            return Fay$$list([Fay$$_(Fay$$_(Fay$$cons)(x))(xs),Fay$$_(Fay$$_(Fay$$cons)(y))(ys),Fay$$_(Fay$$_(Fay$$cons)(z))(zs)]);
          }
          return (function(){ throw (["unhandled case",$tmp1]); })();
        })(Fay$$_(Prelude$unzip3)(ps));
      }
    }
    if (Fay$$_($p1) === null) {
      return Fay$$list([null,null,null]);
    }
    throw ["unhandled case in unzip3",[$p1]];
  });
};
var Prelude$lines = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return null;
    }
    var s = $p1;
    return (function(){
      var isLineBreak = function($p1){
        return new Fay$$$(function(){
          var c = $p1;
          return Fay$$_(Fay$$_(Fay$$or)(Fay$$_(Fay$$_(Fay$$eq)(c))("\r")))(Fay$$_(Fay$$_(Fay$$eq)(c))("\n"));
        });
      };
      return (function($tmp1){
        if (Fay$$listLen(Fay$$_($tmp1),2)) {
          var a = Fay$$index(0,Fay$$_($tmp1));
          if (Fay$$_(Fay$$index(1,Fay$$_($tmp1))) === null) {
            return Fay$$list([a]);
          }
          var a = Fay$$index(0,Fay$$_($tmp1));
          var $tmp2 = Fay$$_(Fay$$index(1,Fay$$_($tmp1)));
          if ($tmp2 instanceof Fay$$Cons) {
            var cs = $tmp2.cdr;
            return Fay$$_(Fay$$_(Fay$$cons)(a))(Fay$$_(Prelude$lines)(cs));
          }
        }
        return (function(){ throw (["unhandled case",$tmp1]); })();
      })(Fay$$_(Fay$$_(Prelude$$_break)(isLineBreak))(s));
    })();
  });
};
var Prelude$unlines = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return null;
    }
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      var l = $tmp1.car;
      var ls = $tmp1.cdr;
      return Fay$$_(Fay$$_(Prelude$$43$$43$)(l))(Fay$$_(Fay$$_(Fay$$cons)("\n"))(Fay$$_(Prelude$unlines)(ls)));
    }
    throw ["unhandled case in unlines",[$p1]];
  });
};
var Prelude$words = function($p1){
  return new Fay$$$(function(){
    var str = $p1;
    return (function(){
      var words$39$ = function($p1){
        return new Fay$$$(function(){
          if (Fay$$_($p1) === null) {
            return null;
          }
          var s = $p1;
          return (function($tmp1){
            if (Fay$$listLen(Fay$$_($tmp1),2)) {
              var a = Fay$$index(0,Fay$$_($tmp1));
              var b = Fay$$index(1,Fay$$_($tmp1));
              return Fay$$_(Fay$$_(Fay$$cons)(a))(Fay$$_(Prelude$words)(b));
            }
            return (function(){ throw (["unhandled case",$tmp1]); })();
          })(Fay$$_(Fay$$_(Prelude$$_break)(isSpace))(s));
        });
      };
      var isSpace = function($p1){
        return new Fay$$$(function(){
          var c = $p1;
          return Fay$$_(Fay$$_(Prelude$elem)(c))(Fay$$list(" \t\r\n\u000c\u000b"));
        });
      };
      return Fay$$_(words$39$)(Fay$$_(Fay$$_(Prelude$dropWhile)(isSpace))(str));
    })();
  });
};
var Prelude$unwords = new Fay$$$(function(){
  return Fay$$_(Prelude$intercalate)(Fay$$list(" "));
});
var Prelude$and = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return true;
    }
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      var x = $tmp1.car;
      var xs = $tmp1.cdr;
      return Fay$$_(Fay$$_(Fay$$and)(x))(Fay$$_(Prelude$and)(xs));
    }
    throw ["unhandled case in and",[$p1]];
  });
};
var Prelude$or = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return false;
    }
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      var x = $tmp1.car;
      var xs = $tmp1.cdr;
      return Fay$$_(Fay$$_(Fay$$or)(x))(Fay$$_(Prelude$or)(xs));
    }
    throw ["unhandled case in or",[$p1]];
  });
};
var Prelude$any = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === null) {
        return false;
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var p = $p1;
        return Fay$$_(Fay$$_(Fay$$or)(Fay$$_(p)(x)))(Fay$$_(Fay$$_(Prelude$any)(p))(xs));
      }
      throw ["unhandled case in any",[$p1,$p2]];
    });
  };
};
var Prelude$all = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === null) {
        return true;
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var p = $p1;
        return Fay$$_(Fay$$_(Fay$$and)(Fay$$_(p)(x)))(Fay$$_(Fay$$_(Prelude$all)(p))(xs));
      }
      throw ["unhandled case in all",[$p1,$p2]];
    });
  };
};
var Prelude$intersperse = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === null) {
        return null;
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var sep = $p1;
        return Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(Fay$$_(Prelude$prependToAll)(sep))(xs));
      }
      throw ["unhandled case in intersperse",[$p1,$p2]];
    });
  };
};
var Prelude$prependToAll = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === null) {
        return null;
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var sep = $p1;
        return Fay$$_(Fay$$_(Fay$$cons)(sep))(Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(Fay$$_(Prelude$prependToAll)(sep))(xs)));
      }
      throw ["unhandled case in prependToAll",[$p1,$p2]];
    });
  };
};
var Prelude$intercalate = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var xss = $p2;
      var xs = $p1;
      return Fay$$_(Prelude$concat)(Fay$$_(Fay$$_(Prelude$intersperse)(xs))(xss));
    });
  };
};
var Prelude$maximum = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return Fay$$_(Prelude$error)(Fay$$list("maximum: empty list"));
    }
    var xs = $p1;
    return Fay$$_(Fay$$_(Prelude$foldl1)(Prelude$max))(xs);
  });
};
var Prelude$minimum = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return Fay$$_(Prelude$error)(Fay$$list("minimum: empty list"));
    }
    var xs = $p1;
    return Fay$$_(Fay$$_(Prelude$foldl1)(Prelude$min))(xs);
  });
};
var Prelude$product = function($p1){
  return new Fay$$$(function(){
    var xs = $p1;
    return Fay$$_(Fay$$_(Fay$$_(Prelude$foldl)(Fay$$mult))(1))(xs);
  });
};
var Prelude$sum = function($p1){
  return new Fay$$$(function(){
    var xs = $p1;
    return Fay$$_(Fay$$_(Fay$$_(Prelude$foldl)(Fay$$add))(0))(xs);
  });
};
var Prelude$scanl = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        var l = $p3;
        var z = $p2;
        var f = $p1;
        return Fay$$_(Fay$$_(Fay$$cons)(z))((function($tmp1){
          if (Fay$$_($tmp1) === null) {
            return null;
          }
          var $tmp2 = Fay$$_($tmp1);
          if ($tmp2 instanceof Fay$$Cons) {
            var x = $tmp2.car;
            var xs = $tmp2.cdr;
            return Fay$$_(Fay$$_(Fay$$_(Prelude$scanl)(f))(Fay$$_(Fay$$_(f)(z))(x)))(xs);
          }
          return (function(){ throw (["unhandled case",$tmp1]); })();
        })(l));
      });
    };
  };
};
var Prelude$scanl1 = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === null) {
        return null;
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var f = $p1;
        return Fay$$_(Fay$$_(Fay$$_(Prelude$scanl)(f))(x))(xs);
      }
      throw ["unhandled case in scanl1",[$p1,$p2]];
    });
  };
};
var Prelude$scanr = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        if (Fay$$_($p3) === null) {
          var z = $p2;
          return Fay$$list([z]);
        }
        var $tmp1 = Fay$$_($p3);
        if ($tmp1 instanceof Fay$$Cons) {
          var x = $tmp1.car;
          var xs = $tmp1.cdr;
          var z = $p2;
          var f = $p1;
          return (function($tmp1){
            var $tmp2 = Fay$$_($tmp1);
            if ($tmp2 instanceof Fay$$Cons) {
              var h = $tmp2.car;
              var t = $tmp2.cdr;
              return Fay$$_(Fay$$_(Fay$$cons)(Fay$$_(Fay$$_(f)(x))(h)))(Fay$$_(Fay$$_(Fay$$cons)(h))(t));
            }
            return Prelude$$_undefined;
          })(Fay$$_(Fay$$_(Fay$$_(Prelude$scanr)(f))(z))(xs));
        }
        throw ["unhandled case in scanr",[$p1,$p2,$p3]];
      });
    };
  };
};
var Prelude$scanr1 = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === null) {
        return null;
      }
      if (Fay$$listLen(Fay$$_($p2),1)) {
        var x = Fay$$index(0,Fay$$_($p2));
        return Fay$$list([x]);
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var f = $p1;
        return (function($tmp1){
          var $tmp2 = Fay$$_($tmp1);
          if ($tmp2 instanceof Fay$$Cons) {
            var h = $tmp2.car;
            var t = $tmp2.cdr;
            return Fay$$_(Fay$$_(Fay$$cons)(Fay$$_(Fay$$_(f)(x))(h)))(Fay$$_(Fay$$_(Fay$$cons)(h))(t));
          }
          return Prelude$$_undefined;
        })(Fay$$_(Fay$$_(Prelude$scanr1)(f))(xs));
      }
      throw ["unhandled case in scanr1",[$p1,$p2]];
    });
  };
};
var Prelude$lookup = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === null) {
        var _key = $p1;
        return Prelude$Nothing;
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        if (Fay$$listLen(Fay$$_($tmp1.car),2)) {
          var x = Fay$$index(0,Fay$$_($tmp1.car));
          var y = Fay$$index(1,Fay$$_($tmp1.car));
          var xys = $tmp1.cdr;
          var key = $p1;
          return Fay$$_(Fay$$_(Fay$$_(Fay$$eq)(key))(x)) ? Fay$$_(Prelude$Just)(y) : Fay$$_(Fay$$_(Prelude$lookup)(key))(xys);
        }
      }
      throw ["unhandled case in lookup",[$p1,$p2]];
    });
  };
};
var Prelude$length = function($p1){
  return new Fay$$$(function(){
    var xs = $p1;
    return Fay$$_(Fay$$_(Prelude$length$39$)(0))(xs);
  });
};
var Prelude$length$39$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var xs = $tmp1.cdr;
        var acc = $p1;
        return Fay$$_(Fay$$_(Prelude$length$39$)(Fay$$_(Fay$$_(Fay$$add)(acc))(1)))(xs);
      }
      var acc = $p1;
      return acc;
    });
  };
};
var Prelude$reverse = function($p1){
  return new Fay$$$(function(){
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      var x = $tmp1.car;
      var xs = $tmp1.cdr;
      return Fay$$_(Fay$$_(Prelude$$43$$43$)(Fay$$_(Prelude$reverse)(xs)))(Fay$$list([x]));
    }
    if (Fay$$_($p1) === null) {
      return null;
    }
    throw ["unhandled case in reverse",[$p1]];
  });
};
var Prelude$print = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["unknown"],(function(x) { if (console && console.log) console.log(x) })(Fay$$fayToJs(["automatic"],$p1))));
  });
};
var Prelude$putStrLn = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["unknown"],(function(x) { if (console && console.log) console.log(x) })(Fay$$fayToJs_string($p1))));
  });
};
var DOM$getWindowWidth = new Fay$$$(function(){
  return new Fay$$Monad(Fay$$jsToFay_int(window.innerWidth));
});
var DOM$getWindowHeight = new Fay$$$(function(){
  return new Fay$$Monad(Fay$$jsToFay_int(window.innerHeight));
});
var DOM$requestAnimationFrame = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["unknown"],window.requestAnimationFrame(Fay$$fayToJs(["action",[["unknown"]]],$p1))));
  });
};
var DOM$getElementById = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","Element",[]],window.document.getElementById(Fay$$fayToJs_string($p1))));
  });
};
var DOM$appendChild = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","Element",[]],$p1).appendChild(Fay$$fayToJs(["user","Element",[]],$p2))));
    });
  };
};
var Math$V = function(vx){
  return function(vy){
    return function(vz){
      return new Fay$$$(function(){
        return new $_Math$V(vx,vy,vz);
      });
    };
  };
};
var Math$vx = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).vx;
  });
};
var Math$vy = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).vy;
  });
};
var Math$vz = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).vz;
  });
};
var Math$Q = function(qx){
  return function(qy){
    return function(qz){
      return function(qw){
        return new Fay$$$(function(){
          return new $_Math$Q(qx,qy,qz,qw);
        });
      };
    };
  };
};
var Math$qx = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).qx;
  });
};
var Math$qy = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).qy;
  });
};
var Math$qz = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).qz;
  });
};
var Math$qw = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).qw;
  });
};
var Math$euler = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        var roll = $p3;
        var pitch = $p2;
        var yaw = $p1;
        return (function(){
          var x = new Fay$$$(function(){
            return Fay$$_(Fay$$_(Fay$$sub)(Fay$$_(Fay$$_(Fay$$mult)(Fay$$_(Fay$$_(Fay$$mult)(sinRoll))(cosPitch)))(cosYaw)))(Fay$$_(Fay$$_(Fay$$mult)(Fay$$_(Fay$$_(Fay$$mult)(cosRoll))(sinPitch)))(sinYaw));
          });
          var y = new Fay$$$(function(){
            return Fay$$_(Fay$$_(Fay$$add)(Fay$$_(Fay$$_(Fay$$mult)(Fay$$_(Fay$$_(Fay$$mult)(cosRoll))(sinPitch)))(cosYaw)))(Fay$$_(Fay$$_(Fay$$mult)(Fay$$_(Fay$$_(Fay$$mult)(sinRoll))(cosPitch)))(sinYaw));
          });
          var z = new Fay$$$(function(){
            return Fay$$_(Fay$$_(Fay$$sub)(Fay$$_(Fay$$_(Fay$$mult)(Fay$$_(Fay$$_(Fay$$mult)(cosRoll))(cosPitch)))(sinYaw)))(Fay$$_(Fay$$_(Fay$$mult)(Fay$$_(Fay$$_(Fay$$mult)(sinRoll))(sinPitch)))(cosYaw));
          });
          var w = new Fay$$$(function(){
            return Fay$$_(Fay$$_(Fay$$add)(Fay$$_(Fay$$_(Fay$$mult)(Fay$$_(Fay$$_(Fay$$mult)(cosRoll))(cosPitch)))(cosYaw)))(Fay$$_(Fay$$_(Fay$$mult)(Fay$$_(Fay$$_(Fay$$mult)(sinRoll))(sinPitch)))(sinYaw));
          });
          var cosYaw = new Fay$$$(function(){
            return Fay$$_(Prelude$cos)(halfYaw);
          });
          var sinYaw = new Fay$$$(function(){
            return Fay$$_(Prelude$sin)(halfYaw);
          });
          var cosPitch = new Fay$$$(function(){
            return Fay$$_(Prelude$cos)(halfPitch);
          });
          var sinPitch = new Fay$$$(function(){
            return Fay$$_(Prelude$sin)(halfPitch);
          });
          var cosRoll = new Fay$$$(function(){
            return Fay$$_(Prelude$cos)(halfRoll);
          });
          var sinRoll = new Fay$$$(function(){
            return Fay$$_(Prelude$sin)(halfRoll);
          });
          var halfYaw = new Fay$$$(function(){
            return Fay$$_(Fay$$_(Fay$$mult)(yaw))(0.5);
          });
          var halfPitch = new Fay$$$(function(){
            return Fay$$_(Fay$$_(Fay$$mult)(pitch))(0.5);
          });
          var halfRoll = new Fay$$$(function(){
            return Fay$$_(Fay$$_(Fay$$mult)(roll))(0.5);
          });
          return Fay$$_(Fay$$_(Fay$$_(Fay$$_(Math$Q)(x))(y))(z))(w);
        })();
      });
    };
  };
};
var Three$hex = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    if (Fay$$_(Fay$$_(Fay$$_(Fay$$and)(Fay$$_(Fay$$_(Fay$$gte)(x))(0)))(Fay$$_(Fay$$_(Fay$$lte)(x))(16777215)))) {
      return x;
    } else {if (true) {
        return Fay$$_(Three$error)(Fay$$_(Fay$$_(Three$$43$$43$)(Fay$$list("Invalid color: ")))(Fay$$_(Three$show)(x)));
      }
    }
  });
};
var Three$mkWebGLRenderer = new Fay$$$(function(){
  return new Fay$$Monad(Fay$$jsToFay(["user","Renderer",[]],new THREE.WebGLRenderer()));
});
var Three$setRendererSize = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","Renderer",[]],$p3).setSize(Fay$$fayToJs_int($p1),Fay$$fayToJs_int($p2))));
      });
    };
  };
};
var Three$setShadowMapEnabled = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","Renderer",[]],$p2).shadowMapEnabled = Fay$$fayToJs_bool($p1)));
    });
  };
};
var Three$setShadowMapSoft = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","Renderer",[]],$p2).shadowMapSoft = Fay$$fayToJs_bool($p1)));
    });
  };
};
var Three$getDomElement = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","Element",[]],Fay$$fayToJs(["user","Renderer",[]],$p1).domElement));
  });
};
var Three$render = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","Renderer",[]],$p3).render(Fay$$fayToJs(["user","Scene",[]],$p1),Fay$$fayToJs(["user","Camera",[]],$p2))));
      });
    };
  };
};
var Three$addChild = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["unknown"],$p1).add(Fay$$fayToJs(["unknown"],$p2))));
    });
  };
};
var Three$setPosition = function($p1){
  return function($p2){
    return function($p3){
      return function($p4){
        return new Fay$$$(function(){
          return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["unknown"],$p4).position.set(Fay$$fayToJs_double($p1),Fay$$fayToJs_double($p2),Fay$$fayToJs_double($p3))));
        });
      };
    };
  };
};
var Three$setRotation = function($p1){
  return function($p2){
    return function($p3){
      return function($p4){
        return function($p5){
          return new Fay$$$(function(){
            return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["unknown"],$p5).rotation.set(Fay$$fayToJs_double($p1),Fay$$fayToJs_double($p2),Fay$$fayToJs_double($p3),Fay$$fayToJs_double($p4))));
          });
        };
      };
    };
  };
};
var Three$setCastShadow = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["unknown"],$p2).castShadow = Fay$$fayToJs_bool($p1)));
    });
  };
};
var Three$setReceiveShadow = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["unknown"],$p2).receiveShadow = Fay$$fayToJs_bool($p1)));
    });
  };
};
var Three$setUseQuaternion = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["unknown"],$p2).useQuaternion = Fay$$fayToJs_bool($p1)));
    });
  };
};
var Three$mkScene = new Fay$$$(function(){
  return new Fay$$Monad(Fay$$jsToFay(["user","Scene",[]],new THREE.Scene()));
});
var Three$mkPerspectiveCamera = function($p1){
  return function($p2){
    return function($p3){
      return function($p4){
        return new Fay$$$(function(){
          return new Fay$$Monad(Fay$$jsToFay(["user","Camera",[]],new THREE.PerspectiveCamera(Fay$$fayToJs_double($p1),Fay$$fayToJs_double($p2),Fay$$fayToJs_double($p3),Fay$$fayToJs_double($p4))));
        });
      };
    };
  };
};
var Three$mkOrthographicCamera = function($p1){
  return function($p2){
    return function($p3){
      return function($p4){
        return function($p5){
          return function($p6){
            return new Fay$$$(function(){
              return new Fay$$Monad(Fay$$jsToFay(["user","Camera",[]],new THREE.OrthographicCamera(Fay$$fayToJs_double($p1),Fay$$fayToJs_double($p2),Fay$$fayToJs_double($p3),Fay$$fayToJs_double($p4),Fay$$fayToJs_double($p5),Fay$$fayToJs_double($p6))));
            });
          };
        };
      };
    };
  };
};
var Three$setUp = function($p1){
  return function($p2){
    return function($p3){
      return function($p4){
        return new Fay$$$(function(){
          return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","Camera",[]],$p4).up = new THREE.Vector3(Fay$$fayToJs_double($p1),Fay$$fayToJs_double($p2),Fay$$fayToJs_double($p3))));
        });
      };
    };
  };
};
var Three$lookAt = function($p1){
  return function($p2){
    return function($p3){
      return function($p4){
        return new Fay$$$(function(){
          return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","Camera",[]],$p4).lookAt(new THREE.Vector3(Fay$$fayToJs_double($p1),Fay$$fayToJs_double($p2),Fay$$fayToJs_double($p3)))));
        });
      };
    };
  };
};
var Three$mkAmbientLight = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","Light",[]],new THREE.AmbientLight(Fay$$fayToJs_int($p1))));
  });
};
var Three$mkDirectionalLight = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","Light",[]],new THREE.DirectionalLight(Fay$$fayToJs_int($p1))));
  });
};
var Three$mkMesh = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","Mesh",[]],new THREE.Mesh(Fay$$fayToJs(["user","Geometry",[]],$p1),Fay$$fayToJs(["user","Material",[]],$p2))));
    });
  };
};
var Three$mkPlaneGeometry = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","Geometry",[]],new THREE.PlaneGeometry(Fay$$fayToJs_double($p1),Fay$$fayToJs_double($p2))));
    });
  };
};
var Three$mkCubeGeometry = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["user","Geometry",[]],new THREE.CubeGeometry(Fay$$fayToJs_double($p1),Fay$$fayToJs_double($p2),Fay$$fayToJs_double($p3))));
      });
    };
  };
};
var Three$mkMeshBasicMaterial = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","Material",[]],new THREE.MeshBasicMaterial({ color: Fay$$fayToJs_int($p1) })));
  });
};
var Three$mkMeshLambertMaterial = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","Material",[]],new THREE.MeshBasicMaterial({ color: Fay$$fayToJs_int($p1), ambient: Fay$$fayToJs_int($p1) })));
  });
};
var Three$setOpacity = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var m = $p2;
      var x = $p1;
      return Fay$$_(Fay$$_(Fay$$then)(Fay$$_(Fay$$_(Three$setTransparent)(Fay$$_(Fay$$_(Fay$$lt)(x))(1)))(m)))(Fay$$_(Fay$$_(Three$setOpacity$39$)(x))(m));
    });
  };
};
var Three$setOpacity$39$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","Material",[]],$p2).opacity = Fay$$fayToJs_double($p1)));
    });
  };
};
var Three$setTransparent = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","Material",[]],$p2).transparent = Fay$$fayToJs_bool($p1)));
    });
  };
};
var Ammo$mkDefaultCollisionConfiguration = new Fay$$$(function(){
  return new Fay$$Monad(Fay$$jsToFay(["user","CollisionConfiguration",[]],new Ammo.btDefaultCollisionConfiguration()));
});
var Ammo$mkCollisionDispatcher = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","Dispatcher",[]],new Ammo.btCollisionDispatcher(Fay$$fayToJs(["user","CollisionConfiguration",[]],$p1))));
  });
};
var Ammo$mkDbvtBroadphase = new Fay$$$(function(){
  return new Fay$$Monad(Fay$$jsToFay(["user","BroadphaseInterface",[]],new Ammo.btDbvtBroadphase()));
});
var Ammo$mkSequentialImpulseConstraintSolver = new Fay$$$(function(){
  return new Fay$$Monad(Fay$$jsToFay(["user","ConstraintSolver",[]],new Ammo.btSequentialImpulseConstraintSolver()));
});
var Ammo$mkDiscreteDynamicsWorld = function($p1){
  return function($p2){
    return function($p3){
      return function($p4){
        return new Fay$$$(function(){
          return new Fay$$Monad(Fay$$jsToFay(["user","DynamicsWorld",[]],new Ammo.btDiscreteDynamicsWorld(Fay$$fayToJs(["user","Dispatcher",[]],$p1),Fay$$fayToJs(["user","BroadphaseInterface",[]],$p2),Fay$$fayToJs(["user","ConstraintSolver",[]],$p3),Fay$$fayToJs(["user","CollisionConfiguration",[]],$p4))));
        });
      };
    };
  };
};
var Ammo$setGravity = function($p1){
  return function($p2){
    return function($p3){
      return function($p4){
        return new Fay$$$(function(){
          return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","DynamicsWorld",[]],$p4).setGravity(new Ammo.btVector3(Fay$$fayToJs_double($p1),Fay$$fayToJs_double($p2),Fay$$fayToJs_double($p3)))));
        });
      };
    };
  };
};
var Ammo$addRigidBody = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","DynamicsWorld",[]],$p1).addRigidBody(Fay$$fayToJs(["user","RigidBody",[]],$p2))));
    });
  };
};
var Ammo$stepSimulation = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","DynamicsWorld",[]],$p3).stepSimulation(Fay$$fayToJs_double($p1),Fay$$fayToJs_int($p2))));
      });
    };
  };
};
var Ammo$mkBtVector3 = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["user","BtVector3",[]],new Ammo.btVector3(Fay$$fayToJs_double($p1),Fay$$fayToJs_double($p2),Fay$$fayToJs_double($p3))));
      });
    };
  };
};
var Ammo$mkBtQuaternion = function($p1){
  return function($p2){
    return function($p3){
      return function($p4){
        return new Fay$$$(function(){
          return new Fay$$Monad(Fay$$jsToFay(["user","BtQuaternion",[]],new Ammo.btQuaternion(Fay$$fayToJs_double($p1),Fay$$fayToJs_double($p2),Fay$$fayToJs_double($p3),Fay$$fayToJs_double($p4))));
        });
      };
    };
  };
};
var Ammo$vec2bt = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) instanceof $_Math$V) {
      var x = Fay$$_($p1).vx;
      var y = Fay$$_($p1).vy;
      var z = Fay$$_($p1).vz;
      return Fay$$_(Fay$$_(Fay$$_(Ammo$mkBtVector3)(x))(y))(z);
    }
    throw ["unhandled case in vec2bt",[$p1]];
  });
};
var Ammo$quat2bt = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) instanceof $_Math$Q) {
      var x = Fay$$_($p1).qx;
      var y = Fay$$_($p1).qy;
      var z = Fay$$_($p1).qz;
      var w = Fay$$_($p1).qw;
      return Fay$$_(Fay$$_(Fay$$_(Fay$$_(Ammo$mkBtQuaternion)(x))(y))(z))(w);
    }
    throw ["unhandled case in quat2bt",[$p1]];
  });
};
var Ammo$bt2vec = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","Vector3",[]],{ instance: 'Vector3', vx: Fay$$fayToJs(["user","BtVector3",[]],$p1).x(), vy: Fay$$fayToJs(["user","BtVector3",[]],$p1).y(), vz: Fay$$fayToJs(["user","BtVector3",[]],$p1).z() }));
  });
};
var Ammo$bt2quat = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","Quaternion",[]],{ instance: 'Quaternion', qx: Fay$$fayToJs(["user","BtQuaternion",[]],$p1).x(), qy: Fay$$fayToJs(["user","BtQuaternion",[]],$p1).y(), qz: Fay$$fayToJs(["user","BtQuaternion",[]],$p1).z(), qw: Fay$$fayToJs(["user","BtQuaternion",[]],$p1).w() }));
  });
};
var Ammo$mkTransform = new Fay$$$(function(){
  return new Fay$$Monad(Fay$$jsToFay(["user","Transform",[]],new Ammo.btTransform()));
});
var Ammo$setIdentity = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","Transform",[]],$p1).setIdentity()));
  });
};
var Ammo$bt_setOrigin = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","Transform",[]],$p2).setOrigin(Fay$$fayToJs(["user","BtVector3",[]],$p1))));
    });
  };
};
var Ammo$bt_getOrigin = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","BtVector3",[]],Fay$$fayToJs(["user","Transform",[]],$p1).getOrigin()));
  });
};
var Ammo$getOrigin = function($p1){
  return new Fay$$$(function(){
    var t = $p1;
    return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Ammo$bt_getOrigin)(t)))(Ammo$bt2vec)))(function($p1){
      var v = $p1;
      return Fay$$_(Fay$$_(Prelude$$36$)(Fay$$$_return))(Fay$$_(Fay$$_(Fay$$_(Math$V)(Fay$$_(Math$vx)(v)))(Fay$$_(Math$vy)(v)))(Fay$$_(Math$vz)(v)));
    });
  });
};
var Ammo$setOrigin = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var t = $p2;
      var v = $p1;
      return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Ammo$vec2bt)(v)))(function($p1){
        var x = $p1;
        return Fay$$_(Fay$$_(Ammo$bt_setOrigin)(x))(t);
      });
    });
  };
};
var Ammo$bt_setOrientation = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","Transform",[]],$p2).setRotation(Fay$$fayToJs(["user","BtQuaternion",[]],$p1))));
    });
  };
};
var Ammo$bt_getOrientation = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","BtQuaternion",[]],Fay$$fayToJs(["user","Transform",[]],$p1).getRotation()));
  });
};
var Ammo$getOrientation = function($p1){
  return new Fay$$$(function(){
    var t = $p1;
    return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Ammo$bt_getOrientation)(t)))(Ammo$bt2quat)))(function($p1){
      var q = $p1;
      return Fay$$_(Fay$$_(Prelude$$36$)(Fay$$$_return))(Fay$$_(Fay$$_(Fay$$_(Fay$$_(Math$Q)(Fay$$_(Math$qx)(q)))(Fay$$_(Math$qy)(q)))(Fay$$_(Math$qz)(q)))(Fay$$_(Math$qw)(q)));
    });
  });
};
var Ammo$setOrientation = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var t = $p2;
      var q = $p1;
      return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Ammo$quat2bt)(q)))(function($p1){
        var x = $p1;
        return Fay$$_(Fay$$_(Ammo$bt_setOrientation)(x))(t);
      });
    });
  };
};
var Ammo$mkBoxShape = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["user","Shape",[]],new Ammo.btBoxShape(new Ammo.btVector3(Fay$$fayToJs_double($p1),Fay$$fayToJs_double($p2),Fay$$fayToJs_double($p3)))));
      });
    };
  };
};
var Ammo$calculateLocalInertia = function($p1){
  return function($p2){
    return function($p3){
      return function($p4){
        return function($p5){
          return new Fay$$$(function(){
            return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","Shape",[]],$p5).calculateLocalInertia(Fay$$fayToJs_double($p1),new Ammo.btVector3(Fay$$fayToJs_double($p2),Fay$$fayToJs_double($p3),Fay$$fayToJs_double($p4)))));
          });
        };
      };
    };
  };
};
var Ammo$mkDefaultMotionState = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","MotionState",[]],new Ammo.btDefaultMotionState(Fay$$fayToJs(["user","Transform",[]],$p1))));
  });
};
var Ammo$getWorldTransform = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","Transform",[]],(function () { var t = new Ammo.btTransform(); Fay$$fayToJs(["user","MotionState",[]],$p1).getWorldTransform(t); return t; })()));
  });
};
var Ammo$mkRigidBody = function($p1){
  return function($p2){
    return function($p3){
      return function($p4){
        return function($p5){
          return function($p6){
            return new Fay$$$(function(){
              return new Fay$$Monad(Fay$$jsToFay(["user","RigidBody",[]],new Ammo.btRigidBody(new Ammo.btRigidBodyConstructionInfo(Fay$$fayToJs_double($p1),Fay$$fayToJs(["user","MotionState",[]],$p2),Fay$$fayToJs(["user","Shape",[]],$p3),new Ammo.btVector3(Fay$$fayToJs_double($p4),Fay$$fayToJs_double($p5),Fay$$fayToJs_double($p6))))));
            });
          };
        };
      };
    };
  };
};
var Ammo$setDamping = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","RigidBody",[]],$p3).setDamping(Fay$$fayToJs_double($p1),Fay$$fayToJs_double($p2))));
      });
    };
  };
};
var Ammo$getMotionState = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","MotionState",[]],Fay$$fayToJs(["user","RigidBody",[]],$p1).getMotionState()));
  });
};
var CatenaryKing$main = new Fay$$$(function(){
  return Fay$$_(Fay$$_(Fay$$bind)(DOM$getWindowWidth))(function($p1){
    var width = $p1;
    return Fay$$_(Fay$$_(Fay$$bind)(DOM$getWindowHeight))(function($p1){
      var height = $p1;
      return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Fay$$_(Fay$$_(CatenaryKing$mkRenderer)(Fay$$list("viewport")))(width))(height)))(function($p1){
        var renderer = $p1;
        return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Fay$$_(CatenaryKing$mkCamera)(width))(height)))(function($p1){
          var camera = $p1;
          return Fay$$_(Fay$$_(Fay$$bind)(CatenaryKing$mkLights))(function($p1){
            var lights = $p1;
            return Fay$$_(Fay$$_(Fay$$bind)(CatenaryKing$mkSeafloor))(function($p1){
              var seafloor = $p1;
              return Fay$$_(Fay$$_(Fay$$bind)(CatenaryKing$mkOcean))(function($p1){
                var ocean = $p1;
                return Fay$$_(Fay$$_(Fay$$bind)(CatenaryKing$mkRig))(function($p1){
                  var rig = $p1;
                  return Fay$$_(Fay$$_(Fay$$bind)(Three$mkScene))(function($p1){
                    var scene = $p1;
                    return Fay$$_(Fay$$_(Fay$$then)(Fay$$_(Fay$$_(Three$addChild)(scene))(camera)))(Fay$$_(Fay$$_(Fay$$then)(Fay$$_(Fay$$_(Prelude$mapM_)(function($p1){
                      var $gen_1 = $p1;
                      return Fay$$_(Fay$$_(Three$addChild)(scene))($gen_1);
                    }))(lights)))(Fay$$_(Fay$$_(Fay$$then)(Fay$$_(Fay$$_(Prelude$mapM_)(function($p1){
                      var $gen_1 = $p1;
                      return Fay$$_(Fay$$_(Three$addChild)(scene))($gen_1);
                    }))(Fay$$list([seafloor,ocean,rig]))))(Fay$$_(Fay$$_(Fay$$bind)(CatenaryKing$mkAmmoWorld))(function($p1){
                      var world = $p1;
                      return Fay$$_(Fay$$_(Fay$$bind)(CatenaryKing$mkRigBody))(function($p1){
                        var rigB = $p1;
                        return Fay$$_(Fay$$_(Fay$$then)(Fay$$_(Fay$$_(Ammo$addRigidBody)(world))(rigB)))(Fay$$_(Fay$$_(Prelude$$36$)(CatenaryKing$animate))(Fay$$_(Fay$$_(Fay$$then)(Fay$$_(Fay$$_(Fay$$_(Ammo$stepSimulation)(Fay$$_(Fay$$_(Fay$$divi)(1.0))(60.0)))(10))(world)))(Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Ammo$getMotionState)(rigB)))(function($p1){
                          var motion = $p1;
                          return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Ammo$getWorldTransform)(motion)))(function($p1){
                            var transform = $p1;
                            return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Ammo$getOrigin)(transform)))(function($p1){
                              if (Fay$$_($p1) instanceof $_Math$V) {
                                var px = Fay$$_($p1).vx;
                                var py = Fay$$_($p1).vy;
                                var pz = Fay$$_($p1).vz;
                                return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Ammo$getOrientation)(transform)))(function($p1){
                                  if (Fay$$_($p1) instanceof $_Math$Q) {
                                    var rx = Fay$$_($p1).qx;
                                    var ry = Fay$$_($p1).qy;
                                    var rz = Fay$$_($p1).qz;
                                    var rw = Fay$$_($p1).qw;
                                    return Fay$$_(Fay$$_(Fay$$then)(Fay$$_(Fay$$_(Fay$$_(Fay$$_(Three$setPosition)(px))(py))(pz))(rig)))(Fay$$_(Fay$$_(Fay$$then)(Fay$$_(Fay$$_(Fay$$_(Fay$$_(Fay$$_(Three$setRotation)(rx))(ry))(rz))(rw))(rig)))(Fay$$_(Fay$$_(Fay$$_(Three$render)(scene))(camera))(renderer)));
                                  }
                                  throw ["unhandled case",$p1];
                                });
                              }
                              throw ["unhandled case",$p1];
                            });
                          });
                        }))));
                      });
                    }))));
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
var CatenaryKing$animate = function($p1){
  return new Fay$$$(function(){
    var go = $p1;
    return Fay$$_(DOM$requestAnimationFrame)(Fay$$_(Fay$$_(Fay$$then)(go))(Fay$$_(CatenaryKing$animate)(go)));
  });
};
var CatenaryKing$mkRenderer = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        var height = $p3;
        var width = $p2;
        var elemId = $p1;
        return Fay$$_(Fay$$_(Fay$$bind)(Three$mkWebGLRenderer))(function($p1){
          var renderer = $p1;
          return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(DOM$getElementById)(elemId)))(function($p1){
            var viewport = $p1;
            return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Three$getDomElement)(renderer)))(function($p1){
              var element = $p1;
              return Fay$$_(Fay$$_(Fay$$then)(Fay$$_(Fay$$_(DOM$appendChild)(viewport))(element)))(Fay$$_(Fay$$_(CatenaryKing$$_with)(renderer))(Fay$$list([Fay$$_(Fay$$_(Three$setRendererSize)(width))(height),Fay$$_(Three$setShadowMapSoft)(true),Fay$$_(Three$setShadowMapEnabled)(true)])));
            });
          });
        });
      });
    };
  };
};
var CatenaryKing$mkCamera = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var height = $p2;
      var width = $p1;
      return (function(){
        var near = 1;
        var far = 1000;
        var zoom = 0.5;
        var right = new Fay$$$(function(){
          return Fay$$_(Fay$$_(Fay$$mult)(Fay$$_(Fay$$_(Fay$$mult)(Fay$$_(Prelude$fromIntegral)(width)))(0.5)))(zoom);
        });
        var top = new Fay$$$(function(){
          return Fay$$_(Fay$$_(Fay$$mult)(Fay$$_(Fay$$_(Fay$$mult)(Fay$$_(Prelude$fromIntegral)(height)))(0.5)))(zoom);
        });
        return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Fay$$_(Fay$$_(Fay$$_(Fay$$_(Fay$$_(Three$mkOrthographicCamera)((-(Fay$$_(right)))))(right))(top))((-(Fay$$_(top)))))(near))(far)))(function($p1){
          var cam = $p1;
          return Fay$$_(Fay$$_(CatenaryKing$$_with)(cam))(Fay$$list([Fay$$_(Fay$$_(Fay$$_(Three$setUp)(0))(0))(1),Fay$$_(Fay$$_(Fay$$_(Three$setPosition)((-(300))))((-(300))))(245),Fay$$_(Fay$$_(Fay$$_(Three$lookAt)(0))(0))(0)]));
        });
      })();
    });
  };
};
var CatenaryKing$mkLights = new Fay$$$(function(){
  return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Three$mkDirectionalLight)(Fay$$_(Three$hex)(16777215))))(function($p1){
    var d = $p1;
    return Fay$$_(Fay$$_(Fay$$then)(Fay$$_(Fay$$_(Fay$$_(Fay$$_(Three$setPosition)((-(300))))(300))(500))(d)))(Fay$$_(Fay$$_(Fay$$then)(Fay$$_(Fay$$_(Three$setCastShadow)(true))(d)))(Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Three$mkAmbientLight)(Fay$$_(Three$hex)(7829367))))(function($p1){
      var a = $p1;
      return Fay$$_(Fay$$$_return)(Fay$$list([d,a]));
    })));
  });
});
var CatenaryKing$mkSeafloor = new Fay$$$(function(){
  return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Fay$$_(Three$mkPlaneGeometry)(200))(200)))(function($p1){
    var geom = $p1;
    return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Three$mkMeshBasicMaterial)(Fay$$_(Three$hex)(3355392))))(function($p1){
      var mat = $p1;
      return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Fay$$_(Three$mkMesh)(geom))(mat)))(function($p1){
        var mesh = $p1;
        return Fay$$_(Fay$$_(CatenaryKing$$_with)(mesh))(Fay$$list([Fay$$_(Three$setReceiveShadow)(true),Fay$$_(Fay$$_(Fay$$_(Three$setPosition)(0))(0))((-(100)))]));
      });
    });
  });
});
var CatenaryKing$mkOcean = new Fay$$$(function(){
  return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Fay$$_(Three$mkPlaneGeometry)(200))(200)))(function($p1){
    var geom = $p1;
    return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Three$mkMeshBasicMaterial)(Fay$$_(Three$hex)(1122884))))(function($p1){
      var mat = $p1;
      return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Fay$$_(Three$mkMesh)(geom))(mat)))(function($p1){
        var mesh = $p1;
        return Fay$$_(Fay$$_(Fay$$then)(Fay$$_(Fay$$_(Three$setOpacity)(0.8))(mat)))(Fay$$_(Fay$$_(Fay$$then)(Fay$$_(Fay$$_(Three$setReceiveShadow)(true))(mesh)))(Fay$$_(Fay$$$_return)(mesh)));
      });
    });
  });
});
var CatenaryKing$mkRig = new Fay$$$(function(){
  return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Fay$$_(Fay$$_(Three$mkCubeGeometry)(100))(100))(15)))(function($p1){
    var geom = $p1;
    return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Three$mkMeshLambertMaterial)(Fay$$_(Three$hex)(3364147))))(function($p1){
      var mat = $p1;
      return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Fay$$_(Three$mkMesh)(geom))(mat)))(function($p1){
        var mesh = $p1;
        return Fay$$_(Fay$$_(CatenaryKing$$_with)(mesh))(Fay$$list([Fay$$_(Three$setCastShadow)(true),Fay$$_(Three$setReceiveShadow)(true),Fay$$_(Three$setUseQuaternion)(true),Fay$$_(Fay$$_(Fay$$_(Three$setPosition)(0))(0))(100)]));
      });
    });
  });
});
var CatenaryKing$mkAmmoWorld = new Fay$$$(function(){
  return Fay$$_(Fay$$_(Fay$$bind)(Ammo$mkDefaultCollisionConfiguration))(function($p1){
    var collisionCfg = $p1;
    return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Ammo$mkCollisionDispatcher)(collisionCfg)))(function($p1){
      var dispatcher = $p1;
      return Fay$$_(Fay$$_(Fay$$bind)(Ammo$mkDbvtBroadphase))(function($p1){
        var broadphase = $p1;
        return Fay$$_(Fay$$_(Fay$$bind)(Ammo$mkSequentialImpulseConstraintSolver))(function($p1){
          var solver = $p1;
          return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Fay$$_(Fay$$_(Fay$$_(Ammo$mkDiscreteDynamicsWorld)(dispatcher))(broadphase))(solver))(collisionCfg)))(function($p1){
            var world = $p1;
            return Fay$$_(Fay$$_(Fay$$then)(Fay$$_(Fay$$_(Fay$$_(Fay$$_(Ammo$setGravity)(0))(0))((-(9.8))))(world)))(Fay$$_(Fay$$$_return)(world));
          });
        });
      });
    });
  });
});
var CatenaryKing$mkRigBody = new Fay$$$(function(){
  var volume = new Fay$$$(function(){
    return Fay$$_(Fay$$_(Fay$$mult)(Fay$$_(Fay$$_(Fay$$mult)(100))(100)))(15);
  });
  var mass = new Fay$$$(function(){
    return Fay$$_(Fay$$_(Fay$$mult)(volume))(700);
  });
  return Fay$$_(Fay$$_(Fay$$bind)(Ammo$mkTransform))(function($p1){
    var transform = $p1;
    return Fay$$_(Fay$$_(Fay$$then)(Fay$$_(Fay$$_(CatenaryKing$$_with)(transform))(Fay$$list([Ammo$setIdentity,Fay$$_(Ammo$setOrigin)(Fay$$_(Fay$$_(Fay$$_(Math$V)(0))(0))(100)),Fay$$_(Fay$$_(Prelude$$36$)(Ammo$setOrientation))(Fay$$_(Fay$$_(Fay$$_(Math$euler)(0))(Fay$$_(Fay$$_(Fay$$divi)(Prelude$pi))(16.0)))((-(Fay$$_(Fay$$_(Fay$$_(Fay$$divi)(Prelude$pi))(8.0))))))]))))(Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Fay$$_(Fay$$_(Ammo$mkBoxShape)(100))(100))(15)))(function($p1){
      var shape = $p1;
      return Fay$$_(Fay$$_(Fay$$then)(Fay$$_(Fay$$_(Fay$$_(Fay$$_(Fay$$_(Ammo$calculateLocalInertia)(mass))(0))(0))(0))(shape)))(Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Ammo$mkDefaultMotionState)(transform)))(function($p1){
        var motionState = $p1;
        return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(Fay$$_(Fay$$_(Fay$$_(Fay$$_(Fay$$_(Ammo$mkRigidBody)(mass))(motionState))(shape))(0))(0))(0)))(function($p1){
          var body = $p1;
          return Fay$$_(Fay$$_(Fay$$then)(Fay$$_(Fay$$_(Fay$$_(Ammo$setDamping)(0.2))(0.2))(body)))(Fay$$_(Fay$$$_return)(body));
        });
      }));
    }));
  });
});
var CatenaryKing$$_with = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var fs = $p2;
      var x = $p1;
      return Fay$$_(Fay$$_(Fay$$then)(Fay$$_(Fay$$_(Prelude$mapM_)(function($p1){
        var $gen_1 = $p1;
        return Fay$$_(Fay$$_(Prelude$$36$)($gen_1))(x);
      }))(fs)))(Fay$$_(Fay$$$_return)(x));
    });
  };
};
var $_Language$Fay$FFI$Nullable = function(slot1){
  this.slot1 = slot1;
};
var $_Language$Fay$FFI$Null = function(){
};
var $_Language$Fay$FFI$Defined = function(slot1){
  this.slot1 = slot1;
};
var $_Language$Fay$FFI$Undefined = function(){
};
var $_Prelude$Just = function(slot1){
  this.slot1 = slot1;
};
var $_Prelude$Nothing = function(){
};
var $_Prelude$Left = function(slot1){
  this.slot1 = slot1;
};
var $_Prelude$Right = function(slot1){
  this.slot1 = slot1;
};
var $_Prelude$Ratio = function(slot1,slot2){
  this.slot1 = slot1;
  this.slot2 = slot2;
};
var $_Prelude$GT = function(){
};
var $_Prelude$LT = function(){
};
var $_Prelude$EQ = function(){
};
var $_Math$V = function(vx,vy,vz){
  this.vx = vx;
  this.vy = vy;
  this.vz = vz;
};
var $_Math$Q = function(qx,qy,qz,qw){
  this.qx = qx;
  this.qy = qy;
  this.qz = qz;
  this.qw = qw;
};
var Fay$$fayToJsUserDefined = function(type,obj){
  var _obj = Fay$$_(obj);
  var argTypes = type[2];
  if (_obj instanceof $_Language$Fay$FFI$Nullable) {
    var obj_ = {"instance": "Nullable"};
    var obj_slot1 = Fay$$fayToJs(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],_obj.slot1);
    if (undefined !== obj_slot1) {
      obj_['slot1'] = obj_slot1;
    }
    return obj_;
  }
  if (_obj instanceof $_Language$Fay$FFI$Null) {
    var obj_ = {"instance": "Null"};
    return obj_;
  }
  if (_obj instanceof $_Language$Fay$FFI$Defined) {
    var obj_ = {"instance": "Defined"};
    var obj_slot1 = Fay$$fayToJs(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],_obj.slot1);
    if (undefined !== obj_slot1) {
      obj_['slot1'] = obj_slot1;
    }
    return obj_;
  }
  if (_obj instanceof $_Language$Fay$FFI$Undefined) {
    var obj_ = {"instance": "Undefined"};
    return obj_;
  }
  if (_obj instanceof $_Prelude$Just) {
    var obj_ = {"instance": "Just"};
    var obj_slot1 = Fay$$fayToJs(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],_obj.slot1);
    if (undefined !== obj_slot1) {
      obj_['slot1'] = obj_slot1;
    }
    return obj_;
  }
  if (_obj instanceof $_Prelude$Nothing) {
    var obj_ = {"instance": "Nothing"};
    return obj_;
  }
  if (_obj instanceof $_Prelude$Left) {
    var obj_ = {"instance": "Left"};
    var obj_slot1 = Fay$$fayToJs(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],_obj.slot1);
    if (undefined !== obj_slot1) {
      obj_['slot1'] = obj_slot1;
    }
    return obj_;
  }
  if (_obj instanceof $_Prelude$Right) {
    var obj_ = {"instance": "Right"};
    var obj_slot1 = Fay$$fayToJs(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],_obj.slot1);
    if (undefined !== obj_slot1) {
      obj_['slot1'] = obj_slot1;
    }
    return obj_;
  }
  if (_obj instanceof $_Prelude$Ratio) {
    var obj_ = {"instance": "Ratio"};
    var obj_slot1 = Fay$$fayToJs_int(_obj.slot1);
    if (undefined !== obj_slot1) {
      obj_['slot1'] = obj_slot1;
    }
    var obj_slot2 = Fay$$fayToJs_int(_obj.slot2);
    if (undefined !== obj_slot2) {
      obj_['slot2'] = obj_slot2;
    }
    return obj_;
  }
  if (_obj instanceof $_Prelude$GT) {
    var obj_ = {"instance": "GT"};
    return obj_;
  }
  if (_obj instanceof $_Prelude$LT) {
    var obj_ = {"instance": "LT"};
    return obj_;
  }
  if (_obj instanceof $_Prelude$EQ) {
    var obj_ = {"instance": "EQ"};
    return obj_;
  }
  if (_obj instanceof $_Math$V) {
    var obj_ = {"instance": "V"};
    var obj_vx = Fay$$fayToJs_double(_obj.vx);
    if (undefined !== obj_vx) {
      obj_['vx'] = obj_vx;
    }
    var obj_vy = Fay$$fayToJs_double(_obj.vy);
    if (undefined !== obj_vy) {
      obj_['vy'] = obj_vy;
    }
    var obj_vz = Fay$$fayToJs_double(_obj.vz);
    if (undefined !== obj_vz) {
      obj_['vz'] = obj_vz;
    }
    return obj_;
  }
  if (_obj instanceof $_Math$Q) {
    var obj_ = {"instance": "Q"};
    var obj_qx = Fay$$fayToJs_double(_obj.qx);
    if (undefined !== obj_qx) {
      obj_['qx'] = obj_qx;
    }
    var obj_qy = Fay$$fayToJs_double(_obj.qy);
    if (undefined !== obj_qy) {
      obj_['qy'] = obj_qy;
    }
    var obj_qz = Fay$$fayToJs_double(_obj.qz);
    if (undefined !== obj_qz) {
      obj_['qz'] = obj_qz;
    }
    var obj_qw = Fay$$fayToJs_double(_obj.qw);
    if (undefined !== obj_qw) {
      obj_['qw'] = obj_qw;
    }
    return obj_;
  }
  return obj;
};
var Fay$$jsToFayUserDefined = function(type,obj){
  var argTypes = type[2];
  if (obj["instance"] === "Nullable") {
    return new $_Language$Fay$FFI$Nullable(Fay$$jsToFay(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],obj["slot1"]));
  }
  if (obj["instance"] === "Null") {
    return new $_Language$Fay$FFI$Null();
  }
  if (obj["instance"] === "Defined") {
    return new $_Language$Fay$FFI$Defined(Fay$$jsToFay(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],obj["slot1"]));
  }
  if (obj["instance"] === "Undefined") {
    return new $_Language$Fay$FFI$Undefined();
  }
  if (obj["instance"] === "Just") {
    return new $_Prelude$Just(Fay$$jsToFay(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],obj["slot1"]));
  }
  if (obj["instance"] === "Nothing") {
    return new $_Prelude$Nothing();
  }
  if (obj["instance"] === "Left") {
    return new $_Prelude$Left(Fay$$jsToFay(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],obj["slot1"]));
  }
  if (obj["instance"] === "Right") {
    return new $_Prelude$Right(Fay$$jsToFay(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],obj["slot1"]));
  }
  if (obj["instance"] === "Ratio") {
    return new $_Prelude$Ratio(Fay$$jsToFay_int(obj["slot1"]),Fay$$jsToFay_int(obj["slot2"]));
  }
  if (obj["instance"] === "GT") {
    return new $_Prelude$GT();
  }
  if (obj["instance"] === "LT") {
    return new $_Prelude$LT();
  }
  if (obj["instance"] === "EQ") {
    return new $_Prelude$EQ();
  }
  if (obj["instance"] === "V") {
    return new $_Math$V(Fay$$jsToFay_double(obj["vx"]),Fay$$jsToFay_double(obj["vy"]),Fay$$jsToFay_double(obj["vz"]));
  }
  if (obj["instance"] === "Q") {
    return new $_Math$Q(Fay$$jsToFay_double(obj["qx"]),Fay$$jsToFay_double(obj["qy"]),Fay$$jsToFay_double(obj["qz"]),Fay$$jsToFay_double(obj["qw"]));
  }
  return obj;
};

// Exports
this.CatenaryKing$animate = CatenaryKing$animate;
this.CatenaryKing$main = CatenaryKing$main;
this.CatenaryKing$mkAmmoWorld = CatenaryKing$mkAmmoWorld;
this.CatenaryKing$mkCamera = CatenaryKing$mkCamera;
this.CatenaryKing$mkLights = CatenaryKing$mkLights;
this.CatenaryKing$mkOcean = CatenaryKing$mkOcean;
this.CatenaryKing$mkRenderer = CatenaryKing$mkRenderer;
this.CatenaryKing$mkRig = CatenaryKing$mkRig;
this.CatenaryKing$mkRigBody = CatenaryKing$mkRigBody;
this.CatenaryKing$mkSeafloor = CatenaryKing$mkSeafloor;
this.CatenaryKing$$_with = CatenaryKing$$_with;

// Built-ins
this._ = Fay$$_;
this.$           = Fay$$$;
this.$fayToJs    = Fay$$fayToJs;
this.$jsToFay    = Fay$$jsToFay;

};
;
var main = new CatenaryKing();
main._(main.CatenaryKing$main);

