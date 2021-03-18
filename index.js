// relay
//
// documentation via: haraka -h relay

const ipaddr = require('../haraka-necessary-helper-plugins/ipaddr.js');
const net    = require('net');

const { Etcd3 } = require('../haraka-necessary-helper-plugins/etcd3');
const etcdClient = new Etcd3();

var domain_list;

exports.register = function () {
    const plugin = this;

    plugin.load_acls();             // domain_list = {}
    plugin.register_hook('mail', 'acl');
}


exports.load_acls = function () {
    const plugin = this;
    domain_list = {};

    etcdClient.getAll().prefix('config/mta/domains/').strings()
    .then(domains => {
      if (domains) {
        domain_list = {};
        for (domain in domains) {
          if (domain.substr(domain.length-7) === "/relays") {
            domain_list[domain] = domains[domain];
          }
        }

        for (curr_domain in domain_list) {
            domain_list[curr_domain].split('\n').forEach(function(ip) {
                if (ip) {
                    const cidr = ip.split('/');
                    if (!net.isIP(cidr[0])) {
                        plugin.logerror(plugin, `invalid entry in Etcd key ${curr_domain}: ${cidr[0]}`);
                    }
                    if (!cidr[1]) {
                        plugin.logerror(plugin, `appending missing CIDR suffix in: ${curr_domain}`);
                    }
                }
            });
        }
      }
      else console.log("Something went wrong while reading config/mta/domains/... from Etcd. You may want to check the relay-etcd-config plugin.");
    });

}

exports.acl = function (next, connection, params) {
    const plugin = this;
    // if (!plugin.cfg.relay.acl) { return next(); }

    if (connection.relaying) { // Sending mail from Haraka, not receiving.
        connection.logdebug(this, `checking ${connection.remote.ip} and domain in allowed relays in etcd configs`);

        const mail_from_domain = params[0].address().split('@')[1];
        const target_acl_domain = "config/mta/domains/" + mail_from_domain + "/relays";

        if (!plugin.is_acl_allowed(connection, target_acl_domain)) {
            connection.results.add(plugin, {skip: 'acl(unlisted)'});
            return next(DENYSOFT, "This relay is not allowed.");
        }

        connection.results.add(plugin, {pass: 'acl'});
        return next(OK);
    }

    return next();
}

exports.is_acl_allowed = function (connection, target) {
    const plugin = this;
    if (domain_list === {}) { return false; }

    const ip = connection.remote.ip;

    const list = domain_list[target].split('\n');

    for (let i=0; i<list.length; i++) {
        if (list[i]) {
            connection.logdebug(plugin, `checking if ${ip} is in ${list[i]}`);
            const cidr = list[i].split('/');
            const c_net  = cidr[0];
            const c_mask = cidr[1] || 32;

            if (!net.isIP(c_net)) continue;  // bad config entry
            if (net.isIPv4(ip) && net.isIPv6(c_net)) continue;
            if (net.isIPv6(ip) && net.isIPv4(c_net)) continue;

            if (ipaddr.parse(ip).match(ipaddr.parse(c_net), c_mask)) {
                connection.logdebug(plugin, `checking if ${ip} is in ${list[i]}: yes`);
                return true;
            }
        }
    }
    
    return false;
}
