var Grammar = exports.Grammar = function Grammar ( description ) {
  this.rule = { }

  for ( var name in description ) {
    var choices = description[name], sequence = [ ];

    for ( var i = 0; i < choices.length; i += 1 ) {
      var choice = choices[i];

      sequence = sequence.concat(choice);

      if ( i < choices.length - 1 ) sequence.push('|');
    }

    this.rule[name] = new Rule(this, name, sequence);
  }

  for ( var name in description ) this.rule[name].build([ ], 1);
}

Grammar.prototype.toString = function toString ( ) {
  var rules = [ ];

  for ( var name in this.rule ) rules.push(this.rule[name]);

  return rules.join('\n');
}

var Rule = exports.Rule = function Rule ( grammar, name, sequence ) {
  this.grammar = grammar;

  this.name = name; this.sequence = [ ]; this.isWrapped = false;
  this.string = ''; this.regex = null; this.mapping = { }
  this.version = 0; this.isBuilding = false; this.isBroken = false;

  this.error = null;

  for ( var i = 0; i < sequence.length; i += 1 ) {
    var part = sequence[i];

    this.isWrapped = this.isWrapped || part == '|';

    this.sequence.push(part);
  }
}

Rule.prototype.build = function build ( tracks, version ) {
  if ( this.version == version ) return this;

  var string = '', index = 0;
  var tracks = tracks instanceof Array ? tracks : tracks == null ? [ tracks ] : [ ];
  var version = version || '' + Math.round(Math.random() * 1000000) + new Date().getTime();

  this.isBuilding = true; this.isBroken = false; this.error = null; this.mapping = { }

  for ( var i = 0; i < tracks.length; i += 1 ) {
    index = this.name == tracks[i] ? 1 : 0;

    this.mapping[tracks[i]] = index ? [ 1 ] : [ ];
  }

  for ( var i = 0; i < this.sequence.length; i += 1 ) {
    var part = this.sequence[i], name = Rule.REFERENCE.exec(part);

    if ( name ) {
      var count = 0, rule = this.grammar.rule[name[1]];

      if ( rule == null ) return this.brake(name + ' is unknown');
      if ( !(rule instanceof Rule) ) return this.brake(name + 'is not properly defined');
      if ( rule.isBuilding ) return this.brake(name + ' is recursive');
      if ( rule.build(tracks, version).isBroken ) return this.brake(name + ' is broken');

      string += rule.string;

      // don't like this at all..
      for ( name in rule.mapping ) {
        var indexes = rule.mapping[name];

        for ( var j = 0; j < indexes.length; j += 1 ) {
          this.mapping[name].push(index + indexes[j]);

          count += 1;
        }
      }

      index += count;
    }
    else string += part;
  }

  if ( this.mapping[this.name] instanceof Array ) string = '(' + string + ')';
  else if ( this.isWrapped ) string = '(?:' + string + ')';

  this.building = false; this.string = string; this.regex = new RegExp(string);

  return this;
}

Rule.prototype.brake = function brake ( reason ) {
  this.isBroken = true;

  this.error = reason instanceof Error ? reason : new Error(reason);

  return this;
}

Rule.prototype.parse = function parse ( string ) {
  if ( !this.version ) this.build([ ], 1);
  if ( this.isBroken ) return this.error;
  
  var result = { }, components = this.regex.exec(string);

  if ( !components ) return new Error(this.name + ' failed to parse "' + string + '"');
  
  for ( var name in this.mapping ) {
    var indexes = this.mapping[name]; result[name] = [ ];

    for ( var i = 0; i < indexes.length; i += 1 ) {
      result[name].push(components[indexes[i]]);
    }
  }

  return result;
}

Rule.prototype.valueOf = function valueOf ( ) {
  return this.regex;
}

Rule.prototype.toString = function toString ( ) {
  return this.name + ' = ' + (this.isBroken ? String(this.error) : this.string);
}

Rule.REFERENCE = /^<([^<>]+)>$/ig;

var compile = exports.compile = function compile ( description ) {
  return new Grammar(description);
}


var description = {
  sip: [[ 'sip', ':', '.*' ]]
}

var grammar = compile(description);

console.log(grammar);
